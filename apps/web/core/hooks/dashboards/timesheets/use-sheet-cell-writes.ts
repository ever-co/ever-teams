'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { requiredTrackingFieldsMessageKeyOf, requiredTrackingFieldsOf } from '@/core/lib/helpers/timer-errors';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import {
	busyWindowsOf,
	type CopyCellPlan,
	dayBoundsOf,
	freeSecondsOf,
	freeWindowsBetween,
	placementLimitOf,
	placementOf,
	reducibleSecondsOf,
	reductionOf,
	sheetCellKeyOf,
	type TimeWindow,
	wholeMinutesOf
} from '@/core/lib/utils/dashboards/timesheet-sheet-edit';
import {
	chunksOf,
	DELETE_BATCH_SIZE,
	logDurationSeconds,
	type SheetDay,
	type SheetRowIdentity,
	sheetRowKeyOf,
	workDayOfLog
} from '@/core/lib/utils/dashboards/timesheets';
import { errorReasonKeyOf, errorStatusOf } from '@/core/lib/utils/error-feedback';
import { queryKeys } from '@/core/query/keys';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import { ETimeLogSource, ETimeLogType } from '@/core/types/generics/enums/timer';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

const SECONDS_PER_MINUTE = 60;
const FORBIDDEN_STATUS = 403;

export interface SheetWriteScope {
	memberId: string | null;
	/** The team new time goes to when its row names none: the team the page is read in. */
	defaultTeamId: string | null;
	allowsFutureDates: boolean;
	/** The member's logs of the period as last read, every filter aside. */
	readMemberLogs: () => ReadonlyArray<ITimeLog>;
	/** Reads the period again and answers the member's logs, so the next write plans on what is saved. */
	refreshMemberLogs: () => Promise<ReadonlyArray<ITimeLog>>;
}

export type CellCommitOutcome = 'saved' | 'unchanged' | 'refused';

export interface CopyRunResult {
	savedCount: number;
	savedSeconds: number;
	skippedCount: number;
	isStopped: boolean;
}

/** The service wraps some failures in its own error; the API's answer is then its cause. */
function causeOf(error: unknown): unknown {
	if (!(error instanceof Error)) {
		return error;
	}
	if (!error.cause) {
		return error;
	}
	return error.cause;
}

function writeErrorKeyOf(error: unknown): string {
	const source = causeOf(error);
	const missingFields = requiredTrackingFieldsOf(source);
	if (missingFields) {
		return requiredTrackingFieldsMessageKeyOf(missingFields);
	}
	const isForbidden = errorStatusOf(source) === FORBIDDEN_STATUS;
	if (isForbidden) {
		return 'dashboard.timesheets.SHEET.EDIT.REFUSED';
	}
	return errorReasonKeyOf(source);
}

function logsOfDay(logs: ReadonlyArray<ITimeLog>, dayKey: string) {
	return logs.filter((log) => {
		const workDay = workDayOfLog(log);
		if (!workDay) {
			return false;
		}
		return localDayKeyOf(workDay) === dayKey;
	});
}

function logsOfCell(logs: ReadonlyArray<ITimeLog>, rowKey: string, dayKey: string) {
	const dayLogs = logsOfDay(logs, dayKey);
	return dayLogs.filter((log) => sheetRowKeyOf(log) === rowKey);
}

function totalOf(logs: ReadonlyArray<ITimeLog>) {
	let total = 0;
	for (const log of logs) {
		total += logDurationSeconds(log);
	}
	return total;
}

/** New time in whole minutes, rounded up so the cell reads what was typed once seconds of tracked time are in it. */
function addedSecondsOf(targetSeconds: number, currentSeconds: number) {
	const difference = targetSeconds - currentSeconds;
	const minutes = Math.ceil(difference / SECONDS_PER_MINUTE);
	return minutes * SECONDS_PER_MINUTE;
}

/** The member's free windows of a day; `extraBusy` is time placed earlier in the same run, not read back yet. */
function freeWindowsOfDay(
	memberLogs: ReadonlyArray<ITimeLog>,
	day: SheetDay,
	extraBusy: ReadonlyArray<TimeWindow>,
	allowsFutureDates: boolean
): TimeWindow[] {
	const bounds = dayBoundsOf(day.date);
	const logBusy = busyWindowsOf(memberLogs, bounds);
	const busy = [...logBusy, ...extraBusy];
	const now = new Date();
	const limit = placementLimitOf(bounds, now, allowsFutureDates);
	return freeWindowsBetween(busy, bounds, limit);
}

/**
 * The writes of the editable week sheet. A typed duration becomes manual time placed in the member's free time of
 * the day (Gauzy deletes whatever a manual entry overlaps, so nothing is ever placed over another entry), and a
 * lower one takes time back from manual entries only. Writes run one at a time, each planned on the logs read
 * after the one before, so two cells of one day never claim the same free minutes.
 */
export function useSheetCellWrites(scope: SheetWriteScope) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const queueRef = useRef<Promise<unknown>>(Promise.resolve());
	const [savingCellKeys, setSavingCellKeys] = useState<ReadonlySet<string>>(() => new Set());
	const [isCopying, setIsCopying] = useState(false);
	const { memberId, defaultTeamId, allowsFutureDates, readMemberLogs, refreshMemberLogs } = scope;

	const translate = useCallback(
		(key: string, values?: Record<string, string | number>) => {
			return t(key as DottedLanguageObjectStringPaths, values);
		},
		[t]
	);

	const markSaving = useCallback((cellKey: string, isSaving: boolean) => {
		setSavingCellKeys((current) => {
			const next = new Set(current);
			if (isSaving) {
				next.add(cellKey);
				return next;
			}
			next.delete(cellKey);
			return next;
		});
	}, []);

	const enqueue = useCallback(<T>(job: () => Promise<T>): Promise<T> => {
		const run = queueRef.current.then(job, job);
		queueRef.current = run.catch(() => undefined);
		return run;
	}, []);

	const refreshOtherViews = useCallback(() => {
		void queryClient.invalidateQueries({ queryKey: queryKeys.timeLogs.all });
		void queryClient.invalidateQueries({ queryKey: queryKeys.activities.all });
	}, [queryClient]);

	const createEntries = useCallback(
		async (identity: SheetRowIdentity, pieces: ReadonlyArray<TimeWindow>) => {
			if (!memberId) {
				return;
			}
			const teamId = identity.organizationTeamId ?? defaultTeamId;
			for (const piece of pieces) {
				await timeLogService.createTimesheetFrom({
					startedAt: piece.start,
					stoppedAt: piece.end,
					employeeId: memberId,
					projectId: identity.projectId ?? undefined,
					taskId: identity.taskId ?? undefined,
					organizationTeamId: teamId ?? undefined,
					isBillable: identity.isBillable,
					logType: ETimeLogType.MANUAL,
					source: ETimeLogSource.TEAMS
				});
			}
		},
		[defaultTeamId, memberId]
	);

	const takeBack = useCallback(
		async (cellLogs: ReadonlyArray<ITimeLog>, excessSeconds: number) => {
			const plan = reductionOf(cellLogs, excessSeconds);
			if (!plan) {
				return false;
			}
			const batches = chunksOf(plan.deleteIds, DELETE_BATCH_SIZE);
			for (const batch of batches) {
				await timeLogService.deleteTaskTimesheetLogs({ logIds: batch });
			}
			const shorten = plan.shorten;
			if (shorten) {
				await timeLogService.updateTimeLog({
					timeLogId: shorten.log.id,
					startedAt: shorten.log.startedAt,
					stoppedAt: shorten.stoppedAt,
					employeeId: memberId ?? undefined
				});
			}
			return true;
		},
		[memberId]
	);

	const writeCell = useCallback(
		async (identity: SheetRowIdentity, day: SheetDay, targetSeconds: number): Promise<CellCommitOutcome> => {
			const memberLogs = readMemberLogs();
			const cellLogs = logsOfCell(memberLogs, identity.key, day.key);
			const currentSeconds = totalOf(cellLogs);
			const shownSeconds = wholeMinutesOf(currentSeconds);
			const isUnchanged = shownSeconds === targetSeconds;
			if (isUnchanged) {
				return 'unchanged';
			}
			const isRaise = targetSeconds > currentSeconds;
			if (isRaise) {
				const addedSeconds = addedSecondsOf(targetSeconds, currentSeconds);
				const freeWindows = freeWindowsOfDay(memberLogs, day, [], allowsFutureDates);
				const pieces = placementOf(addedSeconds, freeWindows, day.date);
				if (!pieces) {
					const freeSeconds = freeSecondsOf(freeWindows);
					const free = formatDurationShort(freeSeconds);
					toast.error(translate('dashboard.timesheets.SHEET.EDIT.NO_ROOM_TITLE'), {
						description: translate('dashboard.timesheets.SHEET.EDIT.NO_ROOM', { free })
					});
					return 'refused';
				}
				await createEntries(identity, pieces);
				return 'saved';
			}
			const excessSeconds = currentSeconds - targetSeconds;
			const isTakenBack = await takeBack(cellLogs, excessSeconds);
			if (!isTakenBack) {
				const reducibleSeconds = reducibleSecondsOf(cellLogs);
				const trackedSeconds = currentSeconds - reducibleSeconds;
				const tracked = formatDurationShort(trackedSeconds);
				toast.error(translate('dashboard.timesheets.SHEET.EDIT.TRACKED_TITLE'), {
					description: translate('dashboard.timesheets.SHEET.EDIT.TRACKED', { tracked })
				});
				return 'refused';
			}
			return 'saved';
		},
		[allowsFutureDates, createEntries, readMemberLogs, takeBack, translate]
	);

	const commitCell = useCallback(
		(identity: SheetRowIdentity, day: SheetDay, targetSeconds: number): Promise<CellCommitOutcome> => {
			const cellKey = sheetCellKeyOf(identity.key, day.key);
			markSaving(cellKey, true);
			return enqueue(async () => {
				try {
					const outcome = await writeCell(identity, day, targetSeconds);
					if (outcome === 'saved') {
						await refreshMemberLogs();
						refreshOtherViews();
					}
					return outcome;
				} catch (error) {
					toast.error(translate('dashboard.timesheets.SHEET.EDIT.SAVE_FAILED'), {
						description: translate(writeErrorKeyOf(error))
					});
					await refreshMemberLogs().catch(() => undefined);
					return 'refused' as const;
				} finally {
					markSaving(cellKey, false);
				}
			});
		},
		[enqueue, markSaving, refreshMemberLogs, refreshOtherViews, translate, writeCell]
	);

	/**
	 * Fills empty cells from last week, one after the other. The time each one places counts as taken for the next
	 * ones of the same day, so the whole run needs one read of the logs before and one after.
	 */
	const applyCopyPlan = useCallback(
		(plans: ReadonlyArray<CopyCellPlan>): Promise<CopyRunResult> => {
			setIsCopying(true);
			return enqueue(async () => {
				const result: CopyRunResult = { savedCount: 0, savedSeconds: 0, skippedCount: 0, isStopped: false };
				const placedByDay = new Map<string, TimeWindow[]>();
				try {
					const memberLogs = await refreshMemberLogs();
					for (const plan of plans) {
						const placedBefore = placedByDay.get(plan.day.key) ?? [];
						const freeWindows = freeWindowsOfDay(memberLogs, plan.day, placedBefore, allowsFutureDates);
						const pieces = placementOf(plan.seconds, freeWindows, plan.day.date);
						if (!pieces) {
							result.skippedCount += 1;
							continue;
						}
						await createEntries(plan.identity, pieces);
						placedByDay.set(plan.day.key, [...placedBefore, ...pieces]);
						result.savedCount += 1;
						result.savedSeconds += plan.seconds;
					}
				} catch (error) {
					result.isStopped = true;
					toast.error(translate('dashboard.timesheets.SHEET.COPY.STOPPED_TITLE'), {
						description: translate(writeErrorKeyOf(error))
					});
				} finally {
					await refreshMemberLogs().catch(() => undefined);
					refreshOtherViews();
					setIsCopying(false);
				}
				return result;
			});
		},
		[allowsFutureDates, createEntries, enqueue, refreshMemberLogs, refreshOtherViews, translate]
	);

	return useMemo(
		() => ({ commitCell, applyCopyPlan, savingCellKeys, isCopying }),
		[applyCopyPlan, commitCell, isCopying, savingCellKeys]
	);
}

export type SheetCellWrites = ReturnType<typeof useSheetCellWrites>;
