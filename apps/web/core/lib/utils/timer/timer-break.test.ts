import { describe, expect, it } from '@jest/globals';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { ETimeLogSource, ETimeLogType } from '@/core/types/generics/enums/timer';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';
import {
	breakElapsedSecondsOf,
	breakOverlapKeyOf,
	breakRefusalKeyOf,
	breakSecondsOf,
	breaksAllowedIn,
	isBreakLog,
	timerBreakStateOf
} from './timer-break';

function logOf(overrides: Partial<ITimeLog>): ITimeLog {
	return {
		id: 'log',
		startedAt: '2026-11-14T12:00:00.000Z',
		stoppedAt: '2026-11-14T13:00:00.000Z',
		duration: 3600,
		logType: ETimeLogType.TRACKED,
		...overrides
	} as ITimeLog;
}

describe('isBreakLog', () => {
	it('is true for a log of type BREAK only', () => {
		expect(isBreakLog(logOf({ logType: ETimeLogType.BREAK }))).toBe(true);
		expect(isBreakLog(logOf({ logType: ETimeLogType.MANUAL }))).toBe(false);
		expect(isBreakLog(logOf({ logType: undefined }))).toBe(false);
		expect(isBreakLog(null)).toBe(false);
	});
});

describe('breaksAllowedIn', () => {
	it('is on only when the organization says true: absent or false keeps breaks out of sight', () => {
		expect(breaksAllowedIn({ allowBreaks: true })).toBe(true);
		expect(breaksAllowedIn({ allowBreaks: false })).toBe(false);
		expect(breaksAllowedIn({})).toBe(false);
		expect(breaksAllowedIn(null)).toBe(false);
	});
});

describe('timerBreakStateOf', () => {
	it('reads a running break: Gauzy answers running false with the break as the last log', () => {
		const status: ITimerStatus = {
			running: false,
			lastLog: logOf({
				logType: ETimeLogType.BREAK,
				isRunning: true,
				startedAt: new Date('2026-11-14T12:00:00.000Z'),
				taskId: 'task-1',
				source: ETimeLogSource.TEAMS
			})
		};
		const state = timerBreakStateOf(status);
		expect(state.isOnBreak).toBe(true);
		expect(state.startedAt?.toISOString()).toBe('2026-11-14T12:00:00.000Z');
		expect(state.taskId).toBe('task-1');
		expect(state.isFromThisApp).toBe(true);
	});

	it('says a break started on another device', () => {
		const status: ITimerStatus = {
			running: false,
			lastLog: logOf({ logType: ETimeLogType.BREAK, isRunning: true, source: ETimeLogSource.MOBILE })
		};
		expect(timerBreakStateOf(status).isFromThisApp).toBe(false);
	});

	it('is not on break for a stopped break, a running work entry or no status', () => {
		const stoppedBreak = { running: false, lastLog: logOf({ logType: ETimeLogType.BREAK, isRunning: false }) };
		const work = { running: true, lastLog: logOf({ logType: ETimeLogType.TRACKED, isRunning: true }) };
		expect(timerBreakStateOf(stoppedBreak).isOnBreak).toBe(false);
		expect(timerBreakStateOf(work).isOnBreak).toBe(false);
		expect(timerBreakStateOf(null).isOnBreak).toBe(false);
	});
});

describe('breakElapsedSecondsOf', () => {
	it('counts whole seconds since the break started, never below zero', () => {
		const startedAt = new Date('2026-11-14T12:00:00.000Z');
		expect(breakElapsedSecondsOf(startedAt, new Date('2026-11-14T12:05:30.900Z'))).toBe(330);
		expect(breakElapsedSecondsOf(startedAt, new Date('2026-11-14T11:59:00.000Z'))).toBe(0);
	});
});

describe('breakSecondsOf', () => {
	it('adds the breaks only', () => {
		const logs = [
			logOf({ id: 'work', logType: ETimeLogType.TRACKED, duration: 10800 }),
			logOf({ id: 'break', logType: ETimeLogType.BREAK }),
			logOf({ id: 'manual', logType: ETimeLogType.MANUAL, duration: 600 })
		];
		expect(breakSecondsOf(logs)).toBe(3600);
	});
});

/** Gauzy's answer to a start or an entry it refuses, as Axios reports it (ever-co/ever-gauzy#11940). */
function axiosErrorOf(status: number, data: Record<string, unknown>) {
	return {
		message: `Request failed with status code ${status}`,
		code: 'ERR_BAD_REQUEST',
		status,
		response: { data, headers: {}, status, statusText: '' }
	};
}

describe('breakRefusalKeyOf', () => {
	it('says breaks are turned off when the organization refuses them', () => {
		const body = {
			statusCode: 403,
			message: 'Breaks are turned off in this organization.',
			code: 'BREAKS_NOT_ALLOWED'
		};
		expect(breakRefusalKeyOf(ApiErrorService.fromAxiosError(axiosErrorOf(403, body)))).toBe('breaks.NOT_ALLOWED');
		// The proxy routes pass Gauzy's body on as is
		expect(breakRefusalKeyOf(body)).toBe('breaks.NOT_ALLOWED');
	});

	it('says the break overlaps another entry', () => {
		const body = { statusCode: 409, message: 'This break overlaps another entry.', code: 'BREAK_OVERLAP' };
		expect(breakRefusalKeyOf(ApiErrorService.fromAxiosError(axiosErrorOf(409, body)))).toBe('breaks.OVERLAP');
	});

	it('gives the usual reason for any other failure', () => {
		const forbidden = { statusCode: 403, message: 'Forbidden' };
		expect(breakRefusalKeyOf(ApiErrorService.fromAxiosError(axiosErrorOf(403, forbidden)))).toBe(
			'toasts.REASONS.PERMISSION'
		);
		expect(breakRefusalKeyOf(new Error('boom'))).toBe('toasts.REASONS.UNKNOWN');
	});
});

describe('breakOverlapKeyOf', () => {
	const overlap = { statusCode: 409, message: 'Overlap.', code: 'BREAK_OVERLAP' };

	it('says which entry runs over which, from the type the person picked', () => {
		const error = ApiErrorService.fromAxiosError(axiosErrorOf(409, overlap));
		expect(breakOverlapKeyOf(error, true)).toBe('breaks.OVERLAP');
		expect(breakOverlapKeyOf(error, false)).toBe('breaks.WORK_OVERLAP');
	});

	it('leaves any other refusal to the usual reasons', () => {
		const conflict = { statusCode: 409, message: 'Conflict.' };
		expect(breakOverlapKeyOf(ApiErrorService.fromAxiosError(axiosErrorOf(409, conflict)), true)).toBeNull();
	});
});
