import { createStore } from 'jotai';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { activeTeamTaskState, teamTasksState } from '../teams/team-tasks';
import { teamTimerStatusState } from './team-timer-status';
import { timerStatusState } from './timer';

const runningOn = (taskId: string) => ({ running: true, lastLog: { taskId } }) as unknown as ITimerStatus;
const task = (id: string) => ({ id, teams: [{ id: 'team-a' }] }) as unknown as TTask;

describe('teamTimerStatusState', () => {
	it('keeps a timer running on the active task after the team task list moved to another project', () => {
		const store = createStore();
		store.set(timerStatusState, runningOn('task-a'));
		store.set(teamTasksState, [task('task-of-the-new-project')]);
		store.set(activeTeamTaskState, task('task-a'));

		expect(store.get(teamTimerStatusState)?.running).toBe(true);
	});

	it('reads a timer running on a task outside the team as stopped', () => {
		const store = createStore();
		store.set(timerStatusState, runningOn('task-elsewhere'));
		store.set(teamTasksState, [task('task-of-the-new-project')]);
		store.set(activeTeamTaskState, task('task-a'));

		expect(store.get(teamTimerStatusState)?.running).toBe(false);
	});
});
