/** @jest-environment jsdom */

import { Provider, createStore } from 'jotai';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';

import {
	activeTeamIdState,
	activeTeamTaskState,
	memberActiveTaskIdState,
	organizationTeamsState,
	teamTasksCompleteState,
	teamTasksState
} from '@/core/stores';
import type { TTask } from '@/core/types/schemas/task/task.schema';

let mockCookieTaskId = 'task-a';

jest.mock('@/core/lib/helpers/index', () => ({
	...jest.requireActual('@/core/lib/helpers/index'),
	getActiveUserTaskCookie: () => ({ taskId: mockCookieTaskId, userId: 'user-a' }),
	getActiveTaskIdCookie: () => mockCookieTaskId,
	setActiveTaskIdCookie: jest.fn(),
	setActiveUserTaskCookie: jest.fn()
}));
jest.mock('./use-organization-teams-employee', () => ({
	useUpdateEmployeeActiveTask: () => ({ updateOrganizationTeamEmployeeActiveTask: jest.fn() })
}));
const mockUpdateTask = jest.fn();
jest.mock('./use-update-task', () => ({ useUpdateTask: () => ({ updateTask: mockUpdateTask }) }));
jest.mock('../../queries/user-user.query', () => ({
	useUserQuery: () => ({ data: { id: 'user-a', employee: { id: 'employee-a' } } })
}));
const mockGetTaskById = jest.fn();
jest.mock('@/core/services/client/api', () => ({
	...jest.requireActual('@/core/services/client/api'),
	taskService: { getTaskById: (taskId: string) => mockGetTaskById(taskId) }
}));

import { useTeamTasksState } from './use-team-tasks-state';

const mockSetActiveTaskIdCookie = jest.mocked(
	(jest.requireMock('@/core/lib/helpers/index') as { setActiveTaskIdCookie: jest.Mock }).setActiveTaskIdCookie
);

const teamTask = (id: string) => ({ id, teams: [{ id: 'team-a' }] }) as unknown as TTask;

function renderWithActiveTask(memberActiveTaskId: string) {
	const store = createStore();
	const members = [{ id: 'member-a', employeeId: 'employee-a' }];
	store.set(organizationTeamsState, [{ id: 'team-a', name: 'Team A', members }] as never);
	store.set(activeTeamIdState, 'team-a');
	store.set(teamTasksState, [teamTask('task-a')]);
	store.set(teamTasksCompleteState, true);
	store.set(memberActiveTaskIdState, memberActiveTaskId);
	store.set(activeTeamTaskState, teamTask('task-a'));
	const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>;
	const view = renderHook(() => useTeamTasksState(), { wrapper });
	return { store, view };
}

describe('useTeamTasksState when the team task list moves to another default project', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockCookieTaskId = 'task-a';
	});

	it('keeps the active task the member is working on, and its cookies', () => {
		const { store } = renderWithActiveTask('task-a');

		act(() => {
			store.set(teamTasksState, [teamTask('task-of-the-new-project')]);
		});

		expect(store.get(activeTeamTaskState)?.id).toBe('task-a');
		expect(mockSetActiveTaskIdCookie).not.toHaveBeenCalledWith('');
	});

	it('still clears an active task the member no longer holds', () => {
		mockCookieTaskId = 'task-gone';
		const { store } = renderWithActiveTask('task-gone');

		act(() => {
			store.set(teamTasksState, [teamTask('task-of-the-new-project')]);
		});

		expect(store.get(activeTeamTaskState)).toBeNull();
	});

	it('leaves the held task from a fresh read when the member switches to another task', async () => {
		const { store, view } = renderWithActiveTask('task-a');
		const heldCopy = { ...teamTask('task-a'), title: 'Old title', members: [{ id: 'employee-a' }] } as TTask;
		const freshTask = {
			...teamTask('task-a'),
			title: 'Renamed by a teammate',
			members: [{ id: 'employee-a' }, { id: 'employee-b' }]
		} as TTask;
		mockGetTaskById.mockResolvedValue(freshTask);
		act(() => {
			store.set(activeTeamTaskState, heldCopy);
			store.set(teamTasksState, [teamTask('task-of-the-new-project')]);
		});

		await act(() => view.result.current.setActiveTask(teamTask('task-of-the-new-project')));

		expect(mockGetTaskById).toHaveBeenCalledWith('task-a');
		expect(mockUpdateTask).toHaveBeenCalledWith({ ...freshTask, members: [{ id: 'employee-b' }] });
	});

	it('still switches, without touching the held task, when it cannot be read again', async () => {
		const { store, view } = renderWithActiveTask('task-a');
		mockGetTaskById.mockRejectedValue(new Error('offline'));
		act(() => {
			store.set(teamTasksState, [teamTask('task-of-the-new-project')]);
		});

		await act(() => view.result.current.setActiveTask(teamTask('task-of-the-new-project')));

		expect(mockUpdateTask).not.toHaveBeenCalled();
		expect(store.get(activeTeamTaskState)?.id).toBe('task-of-the-new-project');
	});
});
