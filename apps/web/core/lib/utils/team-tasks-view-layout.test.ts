import { DEFAULT_TEAM_TASKS_VIEW, tasksOfGroups, type TeamTasksGroup } from './team-tasks-view';
import { isDefaultView, viewSettingsFromStorage } from './team-tasks-view-storage';
import { definitionOf, isSameDefinition, columnsOf, DEFAULT_TASK_VIEW_DEFINITION } from './task-views';

describe('the layout of a view', () => {
	it('keeps a board, and reads anything else as the list every view has been', () => {
		expect(viewSettingsFromStorage({ ...DEFAULT_TEAM_TASKS_VIEW, layout: 'board' }).layout).toBe('board');
		expect(viewSettingsFromStorage({ ...DEFAULT_TEAM_TASKS_VIEW, layout: 'list' })).not.toHaveProperty('layout');
		expect(viewSettingsFromStorage({ ...DEFAULT_TEAM_TASKS_VIEW, layout: 'timeline' })).not.toHaveProperty(
			'layout'
		);
		expect(viewSettingsFromStorage({ ...DEFAULT_TEAM_TASKS_VIEW })).not.toHaveProperty('layout');
	});

	it('leaves views saved before the board exactly as they were', () => {
		const stored = {
			displayOptions: { ...DEFAULT_TEAM_TASKS_VIEW },
			filterOptions: {},
			queryParams: { scope: 'active' }
		};
		expect(isSameDefinition(definitionOf(stored), DEFAULT_TASK_VIEW_DEFINITION)).toBe(true);
		expect(isDefaultView(viewSettingsFromStorage(stored.displayOptions))).toBe(true);
	});

	it('saves a board in the view, which is then no longer the default one', () => {
		const board = {
			...DEFAULT_TASK_VIEW_DEFINITION,
			settings: { ...DEFAULT_TEAM_TASKS_VIEW, layout: 'board' as const }
		};
		const columns = columnsOf(board);
		expect(columns.displayOptions).toMatchObject({ layout: 'board' });
		expect(definitionOf(columns).settings.layout).toBe('board');
		expect(isSameDefinition(definitionOf(columns), DEFAULT_TASK_VIEW_DEFINITION)).toBe(false);
		expect(isDefaultView(board.settings)).toBe(false);
	});
});

describe('the tasks of the groups', () => {
	it('lists each task once, in the order the groups show them', () => {
		const group = (key: string, ids: string[]) =>
			({ key, grouping: 'assignee', value: key, tasks: ids.map((id) => ({ id })) }) as unknown as TeamTasksGroup;
		// Grouped by assignee, a task with two people sits in two groups.
		const tasks = tasksOfGroups([group('ana', ['t1', 't2']), group('sam', ['t2', 't3'])]);
		expect(tasks.map((task) => task.id)).toEqual(['t1', 't2', 't3']);
		expect(tasksOfGroups([])).toEqual([]);
	});
});
