import { types } from 'mobx-state-tree';
import { teamTasksContentOf } from './team-tasks-content';

type Task = { id: string; title: string };

// The task store's own shape for the team's tasks: an array of frozen tasks, replaced by assignment
const TeamTasks = types.model({ teamTasks: types.array(types.frozen<Task>()) }).actions((store) => ({
	setTeamTasks(tasks: Task[]) {
		store.teamTasks = tasks as typeof store.teamTasks;
	}
}));

const HAR_3: Task = { id: 'task-har-3', title: 'Repaint maintenance hatch' };

describe("the team's tasks a memo depends on", () => {
	it('change when the tasks arrive, though the store keeps the same array', () => {
		const store = TeamTasks.create({ teamTasks: [] });
		const arrayBefore = store.teamTasks;
		const contentBefore = teamTasksContentOf(store.teamTasks);

		store.setTeamTasks([HAR_3]);

		expect(store.teamTasks).toBe(arrayBefore);
		expect(teamTasksContentOf(store.teamTasks)).not.toBe(contentBefore);
		expect(teamTasksContentOf(store.teamTasks).find((task) => task.id === 'task-har-3')).toEqual(HAR_3);
	});

	it('stay the same while the tasks do not change, so the memo keeps its result', () => {
		const store = TeamTasks.create({ teamTasks: [HAR_3] });

		expect(teamTasksContentOf(store.teamTasks)).toBe(teamTasksContentOf(store.teamTasks));
	});

	it('are the list itself when it does not come from the store', () => {
		const tasks = [HAR_3];

		expect(teamTasksContentOf(tasks)).toBe(tasks);
	});
});
