/** @jest-environment jsdom */

import { act, renderHook } from '@testing-library/react';

const OPEN = { id: 'open', name: 'open', value: 'open', order: 1, isTodo: true };
const DONE = { id: 'done', name: 'done', value: 'done', order: 2, isDone: true };

const mockTasks = [
	{ id: 't1', title: 'Write the notes', status: 'open', taskStatusId: 'open' },
	{ id: 't2', title: 'Ship the release', status: 'done', taskStatusId: 'done' }
];

function mockAtomValue(atom: string) {
	if (atom === 'tasks') {
		return mockTasks;
	}
	return { members: [] };
}

jest.mock('jotai', () => ({ useAtomValue: (atom: string) => mockAtomValue(atom) }));
jest.mock('@/core/stores', () => ({ activeTeamState: 'team', tasksByTeamState: 'tasks' }));
jest.mock('@/core/hooks/tasks/use-task-statuses-query', () => ({
	useTaskStatusesQuery: () => ({
		taskStatuses: [OPEN, DONE],
		getTaskStatusesLoading: false,
		isError: false,
		refetch: jest.fn()
	})
}));
jest.mock('@/core/hooks/tasks/use-task-priorities-value', () => ({ useTaskPrioritiesValue: () => ({}) }));
jest.mock('@/core/hooks/organizations/projects/use-organization-projects-query', () => ({
	useOrganizationProjectsQuery: () => ({ organizationProjects: [] })
}));
jest.mock('@/core/lib/utils/task-views-enabled', () => ({ isTaskViewsEnabled: () => true }));

import { useTeamTasksView } from '@/core/hooks/tasks/use-team-tasks-view';
import { projectTasksViewOf, type ProjectTasksLayout } from './project-tasks-view';

const DEVICE_VIEW = JSON.stringify({ layout: 'board' });
const DEVICE_SCOPE = JSON.stringify('done');

function taskIdsOf(groups: Array<{ tasks: Array<{ id: string }> }>) {
	const ids: string[] = [];
	for (const group of groups) {
		for (const task of group.tasks) {
			ids.push(task.id);
		}
	}
	return ids.sort();
}

describe("a project's tasks in the Team tasks views", () => {
	beforeEach(() => {
		window.localStorage.clear();
		window.localStorage.setItem('team-tasks-view', DEVICE_VIEW);
		window.localStorage.setItem('team-tasks-scope', DEVICE_SCOPE);
	});

	it('shows every task of the project, the done ones included, in the layout picked', () => {
		const { result } = renderHook(() =>
			useTeamTasksView({
				tasks: mockTasks as never,
				initial: projectTasksViewOf('calendar'),
				resetKey: 'calendar'
			})
		);

		expect(result.current.scope).toBe('all');
		expect(result.current.settings.layout).toBe('calendar');
		expect(taskIdsOf(result.current.groups)).toEqual(['t1', 't2']);
	});

	it("never writes the device's own Team tasks view, whatever changes on the project's", () => {
		const { result, rerender } = renderHook(
			({ layout }: { layout: ProjectTasksLayout }) =>
				useTeamTasksView({ tasks: mockTasks as never, initial: projectTasksViewOf(layout), resetKey: layout }),
			{ initialProps: { layout: 'calendar' as ProjectTasksLayout } }
		);

		act(() => result.current.setGrouping('priority'));
		act(() => result.current.setScope('active'));
		rerender({ layout: 'timeline' });

		expect(result.current.settings.layout).toBe('timeline');
		expect(window.localStorage.getItem('team-tasks-view')).toBe(DEVICE_VIEW);
		expect(window.localStorage.getItem('team-tasks-scope')).toBe(DEVICE_SCOPE);
	});
});
