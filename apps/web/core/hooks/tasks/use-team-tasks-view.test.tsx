/** @jest-environment jsdom */

import { act, renderHook } from '@testing-library/react';

const OPEN = { id: 'open', name: 'open', value: 'open', order: 1, isTodo: true };
const IN_PROGRESS = { id: 'doing', name: 'in-progress', value: 'in-progress', order: 2, isInProgress: true };

const mockTasks = [
	{ id: 't1', title: 'Write the notes', status: 'open', taskStatusId: 'open' },
	{ id: 't2', title: 'Ship the release', status: 'open', taskStatusId: 'open' },
	{ id: 't3', title: 'Call the client', status: 'in-progress', taskStatusId: 'doing' }
];

jest.mock('jotai', () => ({
	useAtomValue: (atom: string) => {
		if (atom === 'tasks') {
			return mockTasks;
		}
		return { members: [] };
	}
}));
jest.mock('@/core/stores', () => ({ activeTeamState: 'team', tasksByTeamState: 'tasks' }));
jest.mock('./use-task-statuses-query', () => ({
	useTaskStatusesQuery: () => ({
		taskStatuses: [OPEN, IN_PROGRESS],
		getTaskStatusesLoading: false,
		isError: false,
		refetch: jest.fn()
	})
}));
jest.mock('./use-task-priorities-value', () => ({ useTaskPrioritiesValue: () => ({}) }));
jest.mock('@/core/hooks/organizations/projects/use-organization-projects-query', () => ({
	useOrganizationProjectsQuery: () => ({ organizationProjects: [] })
}));
jest.mock('@/core/lib/utils/task-views-enabled', () => ({ isTaskViewsEnabled: () => false }));

import { useTeamTasksView } from './use-team-tasks-view';

function taskIdsOf(rows: ReturnType<typeof useTeamTasksView>['rows']) {
	const ids: string[] = [];
	for (const row of rows) {
		if (row.kind === 'task') {
			ids.push(row.task.id);
		}
	}
	return ids;
}

function groupRowCountOf(rows: ReturnType<typeof useTeamTasksView>['rows']) {
	return rows.filter((row) => row.kind === 'group').length;
}

describe('the rows of a view shown as a table', () => {
	beforeEach(() => window.localStorage.clear());

	it('lists every task without group bands, a group folded in the list included', () => {
		const { result } = renderHook(() => useTeamTasksView());
		const openGroup = result.current.groups.find((group) => group.tasks.some((task) => task.id === 't1'));
		if (!openGroup) {
			throw new Error('The list has no group for the open tasks');
		}

		act(() => result.current.toggleGroup(openGroup.key));
		expect(groupRowCountOf(result.current.rows)).toBe(2);
		expect(taskIdsOf(result.current.rows)).toEqual(['t3']);

		act(() => result.current.setLayout('table'));
		expect(groupRowCountOf(result.current.rows)).toBe(0);
		expect(taskIdsOf(result.current.rows).sort()).toEqual(['t1', 't2', 't3']);
		expect([...result.current.orderedIds].sort()).toEqual(['t1', 't2', 't3']);
	});

	it('brings the groups and the folded one back with the list', () => {
		const { result } = renderHook(() => useTeamTasksView());
		const openGroup = result.current.groups.find((group) => group.tasks.some((task) => task.id === 't1'));
		if (!openGroup) {
			throw new Error('The list has no group for the open tasks');
		}
		act(() => result.current.toggleGroup(openGroup.key));
		act(() => result.current.setLayout('table'));

		act(() => result.current.setLayout('list'));
		expect(groupRowCountOf(result.current.rows)).toBe(2);
		expect(taskIdsOf(result.current.rows)).toEqual(['t3']);
		expect(result.current.settings.grouping).toBe('status');
	});

	it('leaves the layout in place when the Display options are reset', () => {
		const { result } = renderHook(() => useTeamTasksView());
		act(() => result.current.setLayout('table'));
		act(() => result.current.setGrouping('priority'));
		expect(result.current.hasDefaultDisplay).toBe(false);

		act(() => result.current.resetView());
		expect(result.current.hasDefaultDisplay).toBe(true);
		expect(result.current.settings.layout).toBe('table');
	});
});
