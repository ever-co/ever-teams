'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { requiredTrackingFieldsMessageKeyOf, requiredTrackingFieldsOf } from '@/core/lib/helpers/timer-errors';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import {
	approvedDayKeysOf,
	busyWindowsOf,
	type CopyCellPlan,
	type CopyFit,
	copyFitOf,
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
	/** The role and the organization allow deleting time: a lower cell deletes its latest manual entries. */
	mayDeleteTime: boolean;
	/** The role and the organization allow changing time: a lower cell shortens a manual entry. */
	mayModifyTime: boolean;
	/** The member's logs of the period as the page last read them, every filter aside. */
	readMemberLogs: () => ReadonlyArray<ITimeLog>;
	/**
	 * Reads the member's logs of the period from the API, whatever the page shows by then, and fails when the read
	 * does: a write is only ever planned on what is saved.
	 */
	readSavedMemberLogs: () => Promise<ReadonlyArray<ITimeLog>>;
}

export type CellCommitOutcome = 'saved' | 'unchanged' | 'refused';

/** How a lower cell went: its time taken back, too little manual time in it, or a right the API would refuse. */
type TakeBackOutcome = 'done' | 'tracked' | 'notAllowed';

export interface CopyRunResult {
	savedCount: number;
	savedSeconds: number;
	skippedCount: number;
	/**
	 * The cells a run stopped by an error did not copy: the one that failed, unless part of its time was saved before
	 * the error, and those after it.
	 */
	notCopiedCount: number;
	/** A run stopped in the middle of a cell of several entries: the entries saved before the error stay. */
	isPartlyCopied: boolean;
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

export function writeErrorKeyOf(error: unknown): string {
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
 * lower one takes time back from manual entries only. Writes run one at a time, each planned on the member's logs
 * read from the API just before it, so neither another cell nor time saved elsewhere since the page was read is
 * ever written over.
 */
export function useSheetCellWrites(scope: SheetWriteScope) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const queueRef = useRef<Promise<unknown>>(Promise.resolve());
	const [savingCellKeys, setSavingCellKeys] = useState<ReadonlySet<string>>(() => new Set());
	const [isCopying, setIsCopying] = useState(false);
	const { memberId, defaultTeamId, allowsFutureDates, readMemberLogs, readSavedMemberLogs } = scope;
	const { mayDeleteTime, mayModifyTime } = scope;

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

	/** Resolves once the sheet shows what is saved; a failed read keeps what was shown. */
	const refreshSheet = useCallback(async () => {
		await queryClient.invalidateQueries({ queryKey: queryKeys.timesheet.all });
	}, [queryClient]);

	const createEntries = useCallback(
		async (identity: SheetRowIdentity, pieces: ReadonlyArray<TimeWindow>, onEntrySaved?: () => void) => {
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
				onEntrySaved?.();
			}
		},
		[defaultTeamId, memberId]
	);

	/**
	 * Takes time back from the cell's manual entries. The API asks for the right to delete time and the right to
	 * change it, each under the role and the organization: a plan that needs one the viewer lacks writes nothing,
	 * so the cell is never left half lowered by a refusal.
	 */
	const takeBack = useCallback(
		async (
			cellLogs: ReadonlyArray<ITimeLog>,
			excessSeconds: number,
			onWrite?: () => void
		): Promise<TakeBackOutcome> => {
			const plan = reductionOf(cellLogs, excessSeconds);
			if (!plan) {
				return 'tracked';
			}
			const deletes = plan.deleteIds.length > 0;
			const shortens = plan.shorten !== null;
			const isDeleteRefused = deletes && !mayDeleteTime;
			const isShortenRefused = shortens && !mayModifyTime;
			if (isDeleteRefused || isShortenRefused) {
				return 'notAllowed';
			}
			const batches = chunksOf(plan.deleteIds, DELETE_BATCH_SIZE);
			for (const batch of batches) {
				await timeLogService.deleteTaskTimesheetLogs({ logIds: batch });
				onWrite?.();
			}
			const shorten = plan.shorten;
			if (shorten) {
				await timeLogService.updateTimeLog({
					timeLogId: shorten.log.id,
					startedAt: shorten.log.startedAt,
					stoppedAt: shorten.stoppedAt,
					employeeId: memberId ?? undefined
				});
				onWrite?.();
			}
			return 'done';
		},
		[mayDeleteTime, mayModifyTime, memberId]
	);

	/** `onWrite` counts each write that went through, so an error after some of them is told from one before any. */
	const writeCell = useCallback(
		async (
			identity: SheetRowIdentity,
			day: SheetDay,
			targetSeconds: number,
			onWrite: () => void
		): Promise<CellCommitOutcome> => {
			const memberLogs = await readSavedMemberLogs();
			const cellLogs = logsOfCell(memberLogs, identity.key, day.key);
			const currentSeconds = totalOf(cellLogs);
			const shownSeconds = wholeMinutesOf(currentSeconds);
			const isUnchanged = shownSeconds === targetSeconds;
			if (isUnchanged) {
				return 'unchanged';
			}
			// The week may have been approved since the sheet was read: its time is no longer changed from here
			const isDayApproved = approvedDayKeysOf(memberLogs).has(day.key);
			if (isDayApproved) {
				toast.error(translate('dashboard.timesheets.SHEET.EDIT.SAVE_FAILED'), {
					description: translate('dashboard.timesheets.SHEET.EDIT.LOCK_APPROVED')
				});
				return 'refused';
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
				await createEntries(identity, pieces, onWrite);
				return 'saved';
			}
			const excessSeconds = currentSeconds - targetSeconds;
			const takeBackOutcome = await takeBack(cellLogs, excessSeconds, onWrite);
			if (takeBackOutcome === 'notAllowed') {
				toast.error(translate('dashboard.timesheets.SHEET.EDIT.SAVE_FAILED'), {
					description: translate('dashboard.timesheets.SHEET.EDIT.TAKE_BACK_NOT_ALLOWED')
				});
				return 'refused';
			}
			if (takeBackOutcome === 'tracked') {
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
		[allowsFutureDates, createEntries, readSavedMemberLogs, takeBack, translate]
	);

	const commitCell = useCallback(
		(identity: SheetRowIdentity, day: SheetDay, targetSeconds: number): Promise<CellCommitOutcome> => {
			const cellKey = sheetCellKeyOf(identity.key, day.key);
			markSaving(cellKey, true);
			return enqueue(async () => {
				// The writes saved so far: a cell written in several of them is partly changed by an error after some
				const progress = { writeCount: 0 };
				const countWrite = () => {
					progress.writeCount += 1;
				};
				try {
					const outcome = await writeCell(identity, day, targetSeconds, countWrite);
					if (outcome === 'saved') {
						refreshOtherViews();
					}
					return outcome;
				} catch (error) {
					const isPartlySaved = progress.writeCount > 0;
					let titleKey = 'dashboard.timesheets.SHEET.EDIT.SAVE_FAILED';
					if (isPartlySaved) {
						titleKey = 'dashboard.timesheets.SHEET.EDIT.PARTLY_SAVED_TITLE';
						refreshOtherViews();
					}
					toast.error(translate(titleKey), {
						description: translate(writeErrorKeyOf(error))
					});
					// The sheet is read again below: the cell then shows the time saved, part of the change included
					return 'refused' as const;
				} finally {
					await refreshSheet().catch(() => undefined);
					markSaving(cellKey, false);
				}
			});
		},
		[enqueue, markSaving, refreshOtherViews, refreshSheet, translate, writeCell]
	);

	const fitCopyPlans = useCallback(
		(plans: ReadonlyArray<CopyCellPlan>): CopyFit => {
			const memberLogs = readMemberLogs();
			const now = new Date();
			return copyFitOf(plans, memberLogs, now, allowsFutureDates);
		},
		[allowsFutureDates, readMemberLogs]
	);

	/**
	 * Fills empty cells from last week, one after the other, on the member's logs read from the API when the run
	 * starts. A cell filled, or a day approved, since the copy was prepared is left alone, and the time each plan
	 * places counts as taken for the next ones of the same day.
	 */
	const applyCopyPlan = useCallback(
		(plans: ReadonlyArray<CopyCellPlan>): Promise<CopyRunResult> => {
			setIsCopying(true);
			return enqueue(async () => {
				const result: CopyRunResult = {
					savedCount: 0,
					savedSeconds: 0,
					skippedCount: 0,
					notCopiedCount: 0,
					isPartlyCopied: false,
					isStopped: false
				};
				const placedByDay = new Map<string, TimeWindow[]>();
				// The entries of the cell being copied saved so far: an error after some leaves that cell partly filled
				const copiedCell = { savedEntries: 0 };
				const countSavedEntry = () => {
					copiedCell.savedEntries += 1;
				};
				try {
					const memberLogs = await readSavedMemberLogs();
					const approvedDayKeys = approvedDayKeysOf(memberLogs);
					for (const plan of plans) {
						copiedCell.savedEntries = 0;
						const isDayApproved = approvedDayKeys.has(plan.day.key);
						if (isDayApproved) {
							result.skippedCount += 1;
							continue;
						}
						const cellLogs = logsOfCell(memberLogs, plan.identity.key, plan.day.key);
						const isCellFilled = cellLogs.length > 0;
						if (isCellFilled) {
							result.skippedCount += 1;
							continue;
						}
						const placedBefore = placedByDay.get(plan.day.key) ?? [];
						const freeWindows = freeWindowsOfDay(memberLogs, plan.day, placedBefore, allowsFutureDates);
						const pieces = placementOf(plan.seconds, freeWindows, plan.day.date);
						if (!pieces) {
							result.skippedCount += 1;
							continue;
						}
						await createEntries(plan.identity, pieces, countSavedEntry);
						placedByDay.set(plan.day.key, [...placedBefore, ...pieces]);
						result.savedCount += 1;
						result.savedSeconds += plan.seconds;
					}
				} catch (error) {
					result.isStopped = true;
					result.isPartlyCopied = copiedCell.savedEntries > 0;
					const partlyCopiedCount = result.isPartlyCopied ? 1 : 0;
					const handledCount = result.savedCount + result.skippedCount + partlyCopiedCount;
					result.notCopiedCount = plans.length - handledCount;
					toast.error(translate('dashboard.timesheets.SHEET.COPY.STOPPED_TITLE'), {
						description: translate(writeErrorKeyOf(error))
					});
				} finally {
					await refreshSheet().catch(() => undefined);
					refreshOtherViews();
					setIsCopying(false);
				}
				return result;
			});
		},
		[allowsFutureDates, createEntries, enqueue, readSavedMemberLogs, refreshOtherViews, refreshSheet, translate]
	);

	return useMemo(
		() => ({ commitCell, applyCopyPlan, fitCopyPlans, savingCellKeys, isCopying }),
		[applyCopyPlan, commitCell, fitCopyPlans, isCopying, savingCellKeys]
	);
}

export type SheetCellWrites = ReturnType<typeof useSheetCellWrites>;
