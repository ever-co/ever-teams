import { timerTaskStartActionOf, type TimerTaskStartState } from './timer-task-start';

const OTHER_TASK: TimerTaskStartState = {
	isTaskClosed: false,
	isActiveTask: false,
	isTimerRunning: false,
	isRunningOnTask: false,
	isMainStartDisabled: false,
	canTrackTask: true
};

const ACTIVE_TASK: TimerTaskStartState = { ...OTHER_TASK, isActiveTask: true };

describe('timerTaskStartActionOf', () => {
	it("starts another task through its card's start, which stops a running timer first", () => {
		expect(timerTaskStartActionOf(OTHER_TASK)).toBe('TASK_START');
		expect(timerTaskStartActionOf({ ...OTHER_TASK, isTimerRunning: true })).toBe('TASK_START');
	});

	it('holds another task back when the daily plan rule does not let its card start it', () => {
		expect(timerTaskStartActionOf({ ...OTHER_TASK, canTrackTask: false })).toBe('BLOCKED_BY_PLAN');
	});

	it('sends the active task through the main Start, where the daily plan dialogs open', () => {
		expect(timerTaskStartActionOf(ACTIVE_TASK)).toBe('MAIN_START');
		expect(timerTaskStartActionOf({ ...ACTIVE_TASK, canTrackTask: false })).toBe('MAIN_START');
	});

	it('leaves a timer that already runs on the task alone, active task or not', () => {
		const running = { isTimerRunning: true, isRunningOnTask: true };

		expect(timerTaskStartActionOf({ ...ACTIVE_TASK, ...running })).toBe('ALREADY_RUNNING');
		expect(timerTaskStartActionOf({ ...OTHER_TASK, ...running })).toBe('ALREADY_RUNNING');
	});

	it('stops a timer that runs on another task before it starts the active one', () => {
		expect(timerTaskStartActionOf({ ...ACTIVE_TASK, isTimerRunning: true })).toBe('TASK_START');
	});

	it('does not start the active task while the main Start is disabled', () => {
		expect(timerTaskStartActionOf({ ...ACTIVE_TASK, isMainStartDisabled: true })).toBe('UNAVAILABLE');
	});

	it('never starts a closed task, active or not', () => {
		expect(timerTaskStartActionOf({ ...OTHER_TASK, isTaskClosed: true })).toBe('TASK_CLOSED');
		expect(timerTaskStartActionOf({ ...ACTIVE_TASK, isTaskClosed: true })).toBe('TASK_CLOSED');
	});
});
