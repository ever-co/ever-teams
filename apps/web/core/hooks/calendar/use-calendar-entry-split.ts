'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { currentLogOf } from '@/core/hooks/dashboards/timesheets/use-bulk-edit-run';
import { splitPartsOf } from '@/core/lib/utils/calendar-split';
import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import { endOfLog, memberIdOfLog, startOfLog, statusOfLog } from '@/core/lib/utils/dashboards/timesheets';
import type { TimeWindow } from '@/core/lib/utils/dashboards/timesheet-sheet-edit';
import { queryKeys } from '@/core/query/keys';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import { ETimeLogSource, ETimeLogType } from '@/core/types/generics/enums/timer';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { ZodValidationError } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { isTakenOnServer, type PartOnServer, partOnServer } from './time-taken-on-server';

/**
 * How a split ended when it did not: refused before any change because another entry now covers the time, or
 * because the entry is no longer the one the dialog split (`changed`), put back as it was, the first part kept and
 * the rest to add by hand, or an outcome the server could not confirm.
 */
export type CalendarSplitFailure = 'overlap' | 'changed' | 'restored' | 'first-part-kept' | 'unknown';

export class CalendarSplitError extends Error {
	constructor(
		readonly failure: CalendarSplitFailure,
		cause: unknown
	) {
		super(`Split failed: ${failure}`, { cause });
		this.name = 'CalendarSplitError';
	}
}

/** A task picked for the second part. */
export type SplitTask = Pick<TTask, 'id' | 'projectId'>;

export interface CalendarSplitRequest {
	log: ITimeLog;
	splitAt: Date;
	/** The task the second part goes to, with its project when it has one; the entry's own task when null. */
	secondTask: SplitTask | null;
	tenantId: string;
}

function windowOfLog(log: ITimeLog): TimeWindow | null {
	const start = startOfLog(log);
	const end = endOfLog(log);
	if (!start || !end) {
		return null;
	}
	return { start, end };
}

/**
 * Whether the entry the API holds now is still the one the dialog split: there, with the same time, task and
 * project, stopped and not approved. Its copy in the grid may be older: shortened from it, a change made since would
 * be undone, and a part added from it would carry the old task.
 */
function isStillTheSplitEntry(planned: ITimeLog, current: ITimeLog | null, window: TimeWindow): boolean {
	if (!current) {
		return false;
	}
	const isRunning = current.isRunning === true;
	const isApproved = statusOfLog(current) === ETimesheetStatus.APPROVED;
	if (isRunning || isApproved) {
		return false;
	}
	const currentWindow = windowOfLog(current);
	const hasSameStart = currentWindow?.start.getTime() === window.start.getTime();
	const hasSameEnd = currentWindow?.end.getTime() === window.end.getTime();
	const hasSameTask = (current.taskId ?? null) === (planned.taskId ?? null);
	const hasSameProject = (current.projectId ?? null) === (planned.projectId ?? null);
	return hasSameStart && hasSameEnd && hasSameTask && hasSameProject;
}

function textOrUndefined(value: string | null | undefined) {
	if (!value) {
		return undefined;
	}
	return value;
}

/**
 * Splits an entry added by hand in two, with the routes the Timesheets page already uses: the entry is shortened to
 * the split time, then the rest is added as a new entry with the same fields (another task, with its project, when
 * one is picked). The order matters: the API deletes whatever new manual time overlaps, so the new part is added
 * only once the entry no longer covers it. A write whose answer is lost may still have been saved: the server is
 * read before anything is undone, and the error says when the outcome is not known.
 */
export async function splitCalendarEntry(request: CalendarSplitRequest) {
	const { log, splitAt, secondTask, tenantId } = request;
	const window = windowOfLog(log);
	if (!window) {
		throw new Error('An entry without a start and an end cannot be split');
	}
	const parts = splitPartsOf(window, splitAt);
	// Both writes name the member: without one, the new part would be filed under nobody, or under the viewer. The
	// entry is left as it was, which the dialog says; it did not change on the server
	const employeeId = memberIdOfLog(log);
	if (!employeeId) {
		throw new CalendarSplitError('restored', new Error('An entry without its member cannot be split'));
	}
	// The entry is read again first: nothing is written from a copy the server no longer holds
	const current = await currentLogOf(log);
	if (!isStillTheSplitEntry(log, current, window)) {
		throw new CalendarSplitError('changed', null);
	}
	// The API deletes whatever new manual time overlaps: an entry saved since the grid was read is never written over
	const isTaken = await isTakenOnServer(log, window);
	if (isTaken) {
		throw new CalendarSplitError('overlap', null);
	}
	try {
		await timeLogService.updateTimeLog({
			timeLogId: log.id,
			startedAt: parts.first.start,
			stoppedAt: parts.first.end,
			employeeId
		});
	} catch (shortenError) {
		await restoreAfterFailedShortening(log, window, shortenError);
	}
	const secondTaskId = secondTask?.id ?? textOrUndefined(log.taskId);
	try {
		await timeLogService.addManualTime({
			tenantId,
			employeeId,
			projectId: textOrUndefined(secondTask?.projectId ?? log.projectId),
			taskId: secondTaskId,
			organizationContactId: textOrUndefined(log.organizationContactId),
			organizationTeamId: textOrUndefined(log.organizationTeamId),
			description: textOrUndefined(log.description),
			reason: textOrUndefined(log.reason),
			isBillable: log.isBillable,
			startedAt: parts.second.start,
			stoppedAt: parts.second.end,
			logType: ETimeLogType.MANUAL,
			source: ETimeLogSource.BROWSER
		});
	} catch (addError) {
		// The API answered and saved the part: only its answer does not have the expected shape
		if (addError instanceof ZodValidationError) {
			return;
		}
		await restoreAfterFailedAdd(log, window, { part: parts.second, taskId: secondTaskId ?? null }, addError);
	}
}

function restoreWindow(log: ITimeLog, window: TimeWindow) {
	return timeLogService.updateTimeLog({
		timeLogId: log.id,
		startedAt: window.start,
		stoppedAt: window.end,
		employeeId: memberIdOfLog(log) ?? undefined
	});
}

/**
 * The shortening failed, yet its answer may only have been lost: the entry is set back to its whole time, which no
 * other entry covers, so it ends as it was either way. When that fails too, the outcome is not known. A refusal of
 * the API (a 4xx) changed nothing: the entry is as it was, and nothing more is written.
 */
async function restoreAfterFailedShortening(log: ITimeLog, window: TimeWindow, shortenError: unknown): Promise<never> {
	const status = errorStatusOf(shortenError);
	const isRefusal = status !== null && status >= 400 && status < 500;
	if (isRefusal) {
		throw new CalendarSplitError('restored', shortenError);
	}
	try {
		await restoreWindow(log, window);
	} catch {
		throw new CalendarSplitError('unknown', shortenError);
	}
	throw new CalendarSplitError('restored', shortenError);
}

/**
 * The second part could not be added. The server is read first: when it holds that very part (a lost answer), the
 * split is done; when another entry covers the time, nothing is stretched over it and the first part is kept; when
 * the time is free, the entry gets its whole time back. When the server cannot be read, or the restoring write fails
 * (it may still have landed), the outcome is not known: nothing more is offered that could write over saved time.
 */
async function restoreAfterFailedAdd(
	log: ITimeLog,
	window: TimeWindow,
	second: { part: TimeWindow; taskId: string | null },
	addError: unknown
) {
	let state: PartOnServer;
	try {
		state = await partOnServer(log, second.part, second.taskId);
	} catch {
		throw new CalendarSplitError('unknown', addError);
	}
	if (state === 'saved') {
		return;
	}
	// Whether the part was saved cannot be told: offering to add it by hand could add it twice
	if (state === 'unclear') {
		throw new CalendarSplitError('unknown', addError);
	}
	if (state === 'taken') {
		throw new CalendarSplitError('first-part-kept', addError);
	}
	try {
		await restoreWindow(log, window);
	} catch {
		throw new CalendarSplitError('unknown', addError);
	}
	throw new CalendarSplitError('restored', addError);
}

export interface CalendarEntrySplit {
	isSaving: boolean;
	failure: CalendarSplitFailure | null;
	save: (request: CalendarSplitRequest) => Promise<boolean>;
	reset: () => void;
}

/** The split of the Calendar's dialog: one at a time, with the failure it shows, and the views read again after. */
export function useCalendarEntrySplit(): CalendarEntrySplit {
	const queryClient = useQueryClient();
	const [isSaving, setIsSaving] = useState(false);
	const [failure, setFailure] = useState<CalendarSplitFailure | null>(null);

	const save = useCallback(
		async (request: CalendarSplitRequest) => {
			setIsSaving(true);
			setFailure(null);
			try {
				await splitCalendarEntry(request);
				return true;
			} catch (error) {
				let next: CalendarSplitFailure = 'restored';
				if (error instanceof CalendarSplitError) {
					next = error.failure;
				}
				setFailure(next);
				return false;
			} finally {
				setIsSaving(false);
				// Whatever happened, the days are read again, so the grid shows where the entry really is
				void queryClient.invalidateQueries({ queryKey: queryKeys.timeLogs.all });
				void queryClient.invalidateQueries({ queryKey: queryKeys.activities.all });
				void queryClient.invalidateQueries({ queryKey: queryKeys.timesheet.all });
			}
		},
		[queryClient]
	);

	const reset = useCallback(() => {
		setFailure(null);
	}, []);

	return useMemo(() => ({ isSaving, failure, save, reset }), [failure, isSaving, reset, save]);
}
