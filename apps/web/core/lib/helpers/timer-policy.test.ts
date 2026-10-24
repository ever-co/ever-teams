import { canRunTimerForState, isStaleTeamsTimer } from './timer-policy';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

describe('timer action eligibility', () => {
	it('requires an active task while the Teams timer is stopped', () => {
		expect(
			canRunTimerForState({
				isEmailVerified: true,
				hasActiveTask: false,
				isActiveTaskClosed: false,
				isTimerRunning: false,
				timerSource: undefined
			})
		).toBe(false);
	});

	it('allows an open active task and rejects a closed one', () => {
		const state = {
			isEmailVerified: true,
			hasActiveTask: true,
			isTimerRunning: false,
			timerSource: ETimeLogSource.TEAMS
		};

		expect(canRunTimerForState({ ...state, isActiveTaskClosed: false })).toBe(true);
		expect(canRunTimerForState({ ...state, isActiveTaskClosed: true })).toBe(false);
	});

	it('allows stopping a timer that is actually running from another source without a task', () => {
		expect(
			canRunTimerForState({
				isEmailVerified: true,
				hasActiveTask: false,
				isActiveTaskClosed: false,
				isTimerRunning: true,
				timerSource: ETimeLogSource.DESKTOP
			})
		).toBe(true);
	});
});

describe('isStaleTeamsTimer', () => {
	const startedAt = new Date('2026-10-12T08:00:00.000Z');
	const runningTeamsLog = (stoppedAt: Date) =>
		({ isRunning: true, source: ETimeLogSource.TEAMS, startedAt, stoppedAt }) as unknown as ITimeLog;
	const minutes = (value: number) => value * 60_000;
	const threshold = minutes(10);

	it('never treats a log without any heartbeat as stale (clients that send none, e.g. the toolkit timers)', () => {
		expect(isStaleTeamsTimer(runningTeamsLog(startedAt), startedAt.getTime() + minutes(60), threshold)).toBe(false);
	});

	it('flags a log whose last heartbeat is older than the threshold', () => {
		const heartbeat = new Date(startedAt.getTime() + 60_000);
		expect(isStaleTeamsTimer(runningTeamsLog(heartbeat), heartbeat.getTime() + minutes(11), threshold)).toBe(true);
	});

	it('keeps a log whose last heartbeat is within the threshold', () => {
		const heartbeat = new Date(startedAt.getTime() + 60_000);
		expect(isStaleTeamsTimer(runningTeamsLog(heartbeat), heartbeat.getTime() + minutes(9), threshold)).toBe(false);
	});

	it('is off with a threshold of 0', () => {
		const heartbeat = new Date(startedAt.getTime() + 60_000);
		expect(isStaleTeamsTimer(runningTeamsLog(heartbeat), heartbeat.getTime() + minutes(600), 0)).toBe(false);
	});

	it('ignores logs from other sources', () => {
		const heartbeat = new Date(startedAt.getTime() + 60_000);
		const desktopLog = { ...runningTeamsLog(heartbeat), source: ETimeLogSource.DESKTOP } as unknown as ITimeLog;
		expect(isStaleTeamsTimer(desktopLog, heartbeat.getTime() + minutes(60), threshold)).toBe(false);
	});
});
