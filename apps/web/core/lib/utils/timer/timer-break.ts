import { ETimeLogSource, ETimeLogType } from '@/core/types/generics/enums/timer';
import { errorReasonKeyOf, gauzyErrorCodeOf } from '@/core/lib/utils/error-feedback';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';

const MILLISECONDS_PER_SECOND = 1000;

/** A break: time away from work, never counted as worked, billable or invoiced time (Gauzy #11940). */
export function isBreakLog(log: Pick<ITimeLog, 'logType'> | null | undefined): boolean {
	return log?.logType === ETimeLogType.BREAK;
}

/** Breaks show only where the organization turned them on; an API without the setting answers without it. */
export function breaksAllowedIn(organization: { allowBreaks?: boolean | null } | null | undefined): boolean {
	return organization?.allowBreaks === true;
}

export interface TimerBreakState {
	isOnBreak: boolean;
	startedAt: Date | null;
	/** The task the break paused, which work starts again on. */
	taskId: string | null;
	/** Whether this app started it; another device's break is shown, and ended, all the same. */
	isFromThisApp: boolean;
}

/** A log's start or end as a date, or null when Gauzy sent none or an unreadable one. */
function dateOrNull(value: Date | string | null | undefined): Date | null {
	if (!value) {
		return null;
	}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return null;
	}
	return date;
}

const NOT_ON_BREAK: TimerBreakState = { isOnBreak: false, startedAt: null, taskId: null, isFromThisApp: false };

/**
 * The break the member is on, read from the timer status. Gauzy answers `running: false` during a break, with the
 * break as the last log, still running: a client that does not know breaks then simply shows the timer stopped.
 */
export function timerBreakStateOf(status: ITimerStatus | null | undefined): TimerBreakState {
	const lastLog = status?.lastLog;
	const isRunningBreak = isBreakLog(lastLog) && lastLog?.isRunning === true;
	if (!isRunningBreak || !lastLog) {
		return NOT_ON_BREAK;
	}
	const startedAt = dateOrNull(lastLog.startedAt);
	return {
		isOnBreak: true,
		startedAt,
		taskId: lastLog.taskId ?? null,
		isFromThisApp: lastLog.source === ETimeLogSource.TEAMS
	};
}

/** Whole seconds since the break started, never below zero (a clock a little behind the server's). */
export function breakElapsedSecondsOf(startedAt: Date, now: Date): number {
	const elapsedMilliseconds = now.getTime() - startedAt.getTime();
	const elapsedSeconds = Math.floor(elapsedMilliseconds / MILLISECONDS_PER_SECOND);
	return Math.max(0, elapsedSeconds);
}

function durationSecondsOf(log: ITimeLog): number {
	const start = dateOrNull(log.startedAt);
	const end = dateOrNull(log.stoppedAt);
	if (start && end) {
		return Math.max(0, Math.round((end.getTime() - start.getTime()) / MILLISECONDS_PER_SECOND));
	}
	const reported = Number(log.duration);
	if (Number.isFinite(reported)) {
		return Math.max(0, reported);
	}
	return 0;
}

/** The time spent on breaks among some logs, the figure shown beside the worked time. */
export function breakSecondsOf(logs: ReadonlyArray<ITimeLog>): number {
	let total = 0;
	for (const log of logs) {
		if (isBreakLog(log)) {
			total += durationSecondsOf(log);
		}
	}
	return total;
}

/** Gauzy's codes for a refused break (#11940), each with the sentence that says why. */
const BREAK_REFUSAL_KEYS: ReadonlyMap<string, string> = new Map([
	['BREAKS_NOT_ALLOWED', 'breaks.NOT_ALLOWED'],
	['BREAK_OVERLAP', 'breaks.OVERLAP']
]);

/** The sentence under a refused break's toast: Gauzy's reason when it gives one of the break rules, else the usual one. */
export function breakRefusalKeyOf(error: unknown): string {
	const code = gauzyErrorCodeOf(error);
	const breakReasonKey = code ? BREAK_REFUSAL_KEYS.get(code) : undefined;
	if (breakReasonKey) {
		return breakReasonKey;
	}
	return errorReasonKeyOf(error);
}

/** The sentence for an entry added by hand that Gauzy refused over a break, or over work for a break; null otherwise. */
export function breakOverlapKeyOf(error: unknown, isBreakEntry: boolean): string | null {
	const isBreakOverlap = gauzyErrorCodeOf(error) === 'BREAK_OVERLAP';
	if (!isBreakOverlap) {
		return null;
	}
	if (isBreakEntry) {
		return 'breaks.OVERLAP';
	}
	return 'breaks.WORK_OVERLAP';
}
