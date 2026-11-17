'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { currentLogOf } from '@/core/hooks/dashboards/timesheets/use-bulk-edit-run';
import { splitPartsOf, splitsOnSlots } from '@/core/lib/utils/calendar-split';
import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import { type ApiSplitFailure, apiSplitFailureOf } from '@/core/lib/utils/time-log-split';
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
 * the rest to add by hand, or an outcome the server could not confirm. Through the API's split: refused with the
 * reason it names, `tracked` when the API turns out not to split tracked time, and `retry` for an outcome not known,
 * which a second try settles (it never splits twice).
 */
export type CalendarSplitFailure =
	| 'overlap'
	| 'changed'
	| 'restored'
	| 'first-part-kept'
	| 'unknown'
	| 'tracked'
	| 'retry'
	| Exclude<ApiSplitFailure, 'not-offered' | 'changed' | 'unknown'>;

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

interface CalendarSplitRequest {
	log: ITimeLog;
	splitAt: Date;
	/** The task the second part goes to, with its project when it has one; the entry's own task when null. */
	secondTask: SplitTask | null;
	tenantId: string;
	/** The API splits in one write (ever-co/ever-gauzy#12030): the split goes through it. */
	viaApi?: boolean;
	/** Why the time changes, where the organization asks for one. */
	reason?: string;
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
function isStillTheSplitEntry(planned: ITimeLog, current: ITimeLog | null, window: TimeWindow): current is ITimeLog {
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
	// The entry is read again first: nothing is written from a copy the server no longer holds, and the second part
	// takes the fields the server holds now (notes or billable state changed in another tab included)
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
		await restoreAfterFailedShortening(
			log,
			{ whole: window, shortened: parts.first, freed: parts.second },
			shortenError
		);
	}
	const secondTaskId = secondTask?.id ?? textOrUndefined(current.taskId);
	try {
		await timeLogService.addManualTime({
			tenantId,
			employeeId,
			projectId: textOrUndefined(secondTask?.projectId ?? current.projectId),
			taskId: secondTaskId,
			organizationContactId: textOrUndefined(current.organizationContactId),
			organizationTeamId: textOrUndefined(current.organizationTeamId),
			description: textOrUndefined(current.description),
			reason: textOrUndefined(current.reason),
			isBillable: current.isBillable,
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
		await restoreAfterFailedAdd(
			log,
			{ whole: window, first: parts.first },
			{ part: parts.second, taskId: secondTaskId ?? null },
			addError
		);
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

function isSameWindow(first: TimeWindow | null, second: TimeWindow): boolean {
	return first?.start.getTime() === second.start.getTime() && first?.end.getTime() === second.end.getTime();
}

/**
 * The shortening failed, yet its answer may only have been lost. A refusal of the API (a 4xx) changed nothing: the
 * entry is as it was, and nothing more is written. Otherwise the time the shortening freed is looked at, then the
 * entry is read again, right before any write: still whole, nothing is written; shortened as asked, it is set back to
 * its whole time while the freed time is still free; in any other state (changed meanwhile, gone, not readable, or
 * another entry saved on the freed time since) nothing is written over it, and the outcome is to be checked.
 */
async function restoreAfterFailedShortening(
	log: ITimeLog,
	windows: { whole: TimeWindow; shortened: TimeWindow; freed: TimeWindow },
	shortenError: unknown
): Promise<never> {
	const status = errorStatusOf(shortenError);
	const isRefusal = status !== null && status >= 400 && status < 500;
	if (isRefusal) {
		throw new CalendarSplitError('restored', shortenError);
	}
	// Another tab may have saved an entry on the freed time since: stretched back over it, the entry would overlap it.
	// A server that cannot be read counts as taken. Looked at before the entry is read, so that no wait comes between
	// that read and the write
	const isFreedTimeTaken = await isTakenOnServer(log, windows.freed).catch(() => true);
	const current = await currentLogOf(log);
	const currentWindow = current ? windowOfLog(current) : null;
	if (isSameWindow(currentWindow, windows.whole)) {
		throw new CalendarSplitError('restored', shortenError);
	}
	const canRestore = isSameWindow(currentWindow, windows.shortened) && !isFreedTimeTaken;
	if (!canRestore) {
		throw new CalendarSplitError('unknown', shortenError);
	}
	try {
		await restoreWindow(log, windows.whole);
	} catch {
		throw new CalendarSplitError('unknown', shortenError);
	}
	throw new CalendarSplitError('restored', shortenError);
}

/**
 * The second part could not be added. The server is read first: when it holds that very part (a lost answer), the
 * split is done; when another entry covers the time, nothing is stretched over it and the first part is kept; when
 * the time is free, the entry is read again and gets its whole time back only while it still holds the first part
 * this split saved (already whole, nothing is written; changed meanwhile in another tab, or gone, nothing is
 * written over it). When the server cannot be read, or the restoring write fails (it may still have landed), the
 * outcome is not known: nothing more is offered that could write over saved time.
 */
async function restoreAfterFailedAdd(
	log: ITimeLog,
	windows: { whole: TimeWindow; first: TimeWindow },
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
	const current = await currentLogOf(log);
	const currentWindow = current ? windowOfLog(current) : null;
	if (isSameWindow(currentWindow, windows.whole)) {
		throw new CalendarSplitError('restored', addError);
	}
	if (!isSameWindow(currentWindow, windows.first)) {
		throw new CalendarSplitError('unknown', addError);
	}
	try {
		await restoreWindow(log, windows.whole);
	} catch {
		throw new CalendarSplitError('unknown', addError);
	}
	throw new CalendarSplitError('restored', addError);
}

/**
 * Splits an entry in one write with the API's split (ever-co/ever-gauzy#12030): the entry ends at the split time and
 * the rest becomes a second entry, on the task picked (with its project) or the entry's own; every time slot goes, with
 * its screenshots and activity, to the part that holds its time. An API without the route leaves time added by hand to
 * the two writes of `splitCalendarEntry`, and tracked time refused as before.
 */
export async function splitThroughApi(request: CalendarSplitRequest) {
	const { log, splitAt, secondTask } = request;
	const secondPart: { taskId?: string; projectId?: string | null; reason?: string } = {};
	// A break's parts stay breaks: the API refuses a task for the second one (TIME_LOG_SPLIT_BREAK_FIELDS)
	const takesTask = secondTask !== null && log.logType !== ETimeLogType.BREAK;
	if (takesTask) {
		secondPart.taskId = secondTask.id;
		secondPart.projectId = secondTask.projectId ?? null;
	}
	const reason = request.reason?.trim();
	if (reason) {
		secondPart.reason = reason;
	}
	try {
		await timeLogService.splitTimeLog({ timeLogId: log.id, splitAt, ...secondPart });
	} catch (error) {
		const failure = apiSplitFailureOf(error);
		if (failure !== 'not-offered') {
			throw new CalendarSplitError(calendarFailureOf(failure), error);
		}
		if (splitsOnSlots(log)) {
			throw new CalendarSplitError('tracked', error);
		}
		await splitCalendarEntry(request);
	}
}

/** The dialog's failure for a refusal of the API; an outcome not known can be tried again, it never splits twice. */
function calendarFailureOf(failure: Exclude<ApiSplitFailure, 'not-offered'>): CalendarSplitFailure {
	if (failure === 'unknown') {
		return 'retry';
	}
	return failure;
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
				if (request.viaApi) {
					await splitThroughApi(request);
				} else {
					await splitCalendarEntry(request);
				}
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
