import { createStore } from 'jotai';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';
import { localTimerStatusState, timerStatusState, timerTaskIdState } from './timer';

const statusOn = (taskId: string, running: boolean) => ({ running, lastLog: { taskId } }) as unknown as ITimerStatus;

describe('timerTaskIdState', () => {
	it('names the task a start was sent for, before the server status says it runs', () => {
		const store = createStore();
		store.set(timerStatusState, statusOn('task-before', false));
		store.set(localTimerStatusState, { lastTaskId: 'task-a', runnedDateTime: 1, running: true });

		expect(store.get(timerTaskIdState)).toBe('task-a');
	});

	it('names the task of a run the server reports, whichever device started it', () => {
		const store = createStore();
		store.set(timerStatusState, statusOn('task-a', true));

		expect(store.get(timerTaskIdState)).toBe('task-a');
	});

	it('names no task while no timer runs', () => {
		const store = createStore();
		store.set(timerStatusState, statusOn('task-a', false));
		store.set(localTimerStatusState, { lastTaskId: 'task-a', runnedDateTime: 0, running: false });

		expect(store.get(timerTaskIdState)).toBeNull();
	});
});
