import { createStore } from 'jotai';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { activeTeamIdState } from '../teams/organization-team';
import { activeTeamTaskState, teamTasksState } from '../teams/team-tasks';
import { teamTimerStatusState } from './team-timer-status';
import { timerStatusState } from './timer';

const runningOn = (taskId: string) => ({ running: true, lastLog: { taskId } }) as unknown as ITimerStatus;
/** A run whose log names the team it was started for, as Gauzy's timer status returns it. */
const runningFor = (teamId: string, taskId: string) =>
	({ running: true, lastLog: { taskId, organizationTeamId: teamId } }) as unknown as ITimerStatus;
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

	describe('when the log names the team the run was started for', () => {
		it("keeps a run of the active team running on another project's task, with no active task after a reload", () => {
			const store = createStore();
			store.set(activeTeamIdState, 'team-a');
			store.set(timerStatusState, runningFor('team-a', 'task-of-another-project'));
			store.set(teamTasksState, [task('task-of-the-listed-project')]);
			store.set(activeTeamTaskState, null);

			expect(store.get(teamTimerStatusState)?.running).toBe(true);
		});

		it("reads another team's run as stopped, even on a task the active team lists and holds", () => {
			const store = createStore();
			store.set(activeTeamIdState, 'team-a');
			store.set(timerStatusState, runningFor('team-b', 'task-of-both-teams'));
			store.set(teamTasksState, [task('task-of-both-teams')]);
			store.set(activeTeamTaskState, task('task-of-both-teams'));

			expect(store.get(teamTimerStatusState)?.running).toBe(false);
		});
	});
});
