import {
	canRunTimerForState,
	canTrackTask,
	getTimerAction,
	isStaleTeamsTimer,
	type TimerPolicyState
} from './timer-policy';
import type { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';
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
				isRunShown: false,
				timerSource: undefined
			})
		).toBe(false);
	});

	it('allows an open active task and rejects a closed one', () => {
		const state = {
			isEmailVerified: true,
			hasActiveTask: true,
			isTimerRunning: false,
			isRunShown: false,
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
				isRunShown: false,
				timerSource: ETimeLogSource.DESKTOP
			})
		).toBe(true);
	});

	describe('with a Teams timer running and no active task', () => {
		const teamsRunWithoutTask = {
			isEmailVerified: true,
			hasActiveTask: false,
			isActiveTaskClosed: false,
			isTimerRunning: true,
			timerSource: ETimeLogSource.TEAMS
		};

		it("allows stopping it when the timer shows it: a reload leaves no active task on another project's task", () => {
			expect(canRunTimerForState({ ...teamsRunWithoutTask, isRunShown: true })).toBe(true);
		});

		it('keeps it out of reach when the timer does not show it (another team)', () => {
			expect(canRunTimerForState({ ...teamsRunWithoutTask, isRunShown: false })).toBe(false);
		});
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

describe('canTrackTask', () => {
	const planWith = (...taskIds: string[]) => ({ tasks: taskIds.map((id) => ({ id })) }) as unknown as TDailyPlan;

	it('refuses when tracking is not possible at all', () => {
		expect(canTrackTask(false, false, planWith('task-1'), 'task-1')).toBe(false);
	});

	it('lets any task start when the team does not require a plan', () => {
		expect(canTrackTask(true, false, undefined, 'task-1')).toBe(true);
	});

	it("lets a task of today's plan start when the team requires one", () => {
		expect(canTrackTask(true, true, planWith('task-1', 'task-2'), 'task-2')).toBe(true);
	});

	it("refuses a task left out of today's plan when the team requires one", () => {
		expect(canTrackTask(true, true, planWith('task-1'), 'task-2')).toBe(false);
		expect(canTrackTask(true, true, undefined, 'task-2')).toBe(false);
	});
});

describe('getTimerAction', () => {
	/** A stopped timer that can start, on a planned and fully estimated task, nothing seen today yet. */
	const stateWith = (overrides: Partial<TimerPolicyState> = {}): TimerPolicyState => ({
		isTimerStatusFetching: false,
		canRunTimer: true,
		isTimerRunning: false,
		requirePlan: false,
		hasPlan: true,
		isActiveTaskPlanned: true,
		areAllTasksEstimated: true,
		hasWorkedHours: true,
		estimationTimeDifference: 0,
		hasSeenSuggestionModalToday: false,
		hasSeenEstimateHoursModalToday: false,
		hasSeenPlanEstimateHoursModalToday: false,
		...overrides
	});

	it('does nothing while the status loads or when the timer cannot run', () => {
		expect(getTimerAction(stateWith({ isTimerStatusFetching: true }))).toEqual({ type: 'NOOP' });
		expect(getTimerAction(stateWith({ canRunTimer: false }))).toEqual({ type: 'NOOP' });
	});

	it('stops a running timer, whatever the plan rule', () => {
		expect(getTimerAction(stateWith({ isTimerRunning: true }))).toEqual({ type: 'STOP_TIMER' });
		expect(getTimerAction(stateWith({ isTimerRunning: true, requirePlan: true, hasPlan: false }))).toEqual({
			type: 'STOP_TIMER'
		});
	});

	describe('when the team does not require a plan', () => {
		it.each([
			['without a plan for today', { hasPlan: false, isActiveTaskPlanned: false, areAllTasksEstimated: false }],
			['with a plan that leaves the task out', { isActiveTaskPlanned: false }],
			['with the task planned but not estimated', { areAllTasksEstimated: false, hasWorkedHours: false }],
			['with planned hours far from the estimates', { estimationTimeDifference: 5 }],
			[
				'after every plan prompt was seen today',
				{
					hasSeenSuggestionModalToday: true,
					hasSeenEstimateHoursModalToday: true,
					hasSeenPlanEstimateHoursModalToday: true
				}
			]
		])('starts the timer at once %s', (_case, overrides: Partial<TimerPolicyState>) => {
			expect(getTimerAction(stateWith(overrides))).toEqual({ type: 'START_TIMER' });
		});
	});

	describe('when the team requires a plan', () => {
		const required = (overrides: Partial<TimerPolicyState> = {}) => stateWith({ requirePlan: true, ...overrides });

		it("blocks a task left out of today's plan", () => {
			expect(getTimerAction(required({ isActiveTaskPlanned: false }))).toEqual({
				type: 'SHOW_MODAL',
				modal: 'ENFORCE_PLAN'
			});
		});

		it('asks for a plan when there is none for today', () => {
			expect(getTimerAction(required({ hasPlan: false, isActiveTaskPlanned: false }))).toEqual({
				type: 'SHOW_MODAL',
				modal: 'SUGGEST_DAILY_PLAN'
			});
		});

		it("opens today's plan first when the task is planned", () => {
			expect(getTimerAction(required())).toEqual({ type: 'SHOW_MODAL', modal: 'TASKS_ESTIMATION_HOURS' });
		});

		it('keeps asking for estimates and hours while the plan lacks them', () => {
			const seenEverything = {
				hasSeenSuggestionModalToday: true,
				hasSeenEstimateHoursModalToday: true,
				hasSeenPlanEstimateHoursModalToday: true
			};
			expect(getTimerAction(required({ ...seenEverything, areAllTasksEstimated: false }))).toEqual({
				type: 'SHOW_MODAL',
				modal: 'TASKS_ESTIMATION_HOURS'
			});
			expect(getTimerAction(required({ ...seenEverything, hasWorkedHours: false }))).toEqual({
				type: 'SHOW_MODAL',
				modal: 'TASKS_ESTIMATION_HOURS'
			});
			expect(getTimerAction(required({ ...seenEverything, estimationTimeDifference: 2 }))).toEqual({
				type: 'SHOW_MODAL',
				modal: 'TASKS_ESTIMATION_HOURS'
			});
		});

		it('starts once the plan was reviewed today and is complete', () => {
			expect(
				getTimerAction(
					required({
						hasSeenSuggestionModalToday: true,
						hasSeenEstimateHoursModalToday: true,
						hasSeenPlanEstimateHoursModalToday: true
					})
				)
			).toEqual({ type: 'START_TIMER' });
		});
	});
});
