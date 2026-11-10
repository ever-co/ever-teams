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
jest.mock('./use-update-task', () => ({ useUpdateTask: () => ({ updateTask: jest.fn() }) }));
jest.mock('../../queries/user-user.query', () => ({ useUserQuery: () => ({ data: { id: 'user-a' } }) }));

import { useTeamTasksState } from './use-team-tasks-state';

const mockSetActiveTaskIdCookie = jest.mocked(
	(jest.requireMock('@/core/lib/helpers/index') as { setActiveTaskIdCookie: jest.Mock }).setActiveTaskIdCookie
);
const mockSetActiveUserTaskCookie = jest.mocked(
	(jest.requireMock('@/core/lib/helpers/index') as { setActiveUserTaskCookie: jest.Mock }).setActiveUserTaskCookie
);

const teamTask = (id: string) => ({ id, teams: [{ id: 'team-a' }] }) as unknown as TTask;

function renderWithActiveTask(memberActiveTaskId: string) {
	const store = createStore();
	store.set(organizationTeamsState, [{ id: 'team-a', name: 'Team A', members: [] }] as never);
	store.set(activeTeamIdState, 'team-a');
	store.set(teamTasksState, [teamTask('task-a')]);
	store.set(teamTasksCompleteState, true);
	store.set(memberActiveTaskIdState, memberActiveTaskId);
	store.set(activeTeamTaskState, teamTask('task-a'));
	const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>;
	renderHook(() => useTeamTasksState(), { wrapper });
	return store;
}

describe('useTeamTasksState when the team task list moves to another default project', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockCookieTaskId = 'task-a';
	});

	it('keeps the active task the member is working on, and its cookies', () => {
		const store = renderWithActiveTask('task-a');

		act(() => {
			store.set(teamTasksState, [teamTask('task-of-the-new-project')]);
		});

		expect(store.get(activeTeamTaskState)?.id).toBe('task-a');
		expect(mockSetActiveTaskIdCookie).not.toHaveBeenCalledWith('');
	});

	it('still clears an active task the member no longer holds', () => {
		mockCookieTaskId = 'task-gone';
		const store = renderWithActiveTask('task-gone');

		act(() => {
			store.set(teamTasksState, [teamTask('task-of-the-new-project')]);
		});

		expect(store.get(activeTeamTaskState)).toBeNull();
	});
});

describe('useTeamTasksState on a device where no task of the team was chosen', () => {
	const assignedTask = (id: string, userIds: string[] = ['user-a']) =>
		({ id, teams: [{ id: 'team-a' }], members: userIds.map((userId) => ({ userId })) }) as unknown as TTask;

	const teamWithMember = (member: Record<string, unknown>) =>
		[
			{ id: 'team-a', name: 'Team A', members: [{ id: 'member-a', employee: { userId: 'user-a' }, ...member }] }
		] as never;

	function renderOnDevice(member: Record<string, unknown>, tasks: TTask[]) {
		const store = createStore();
		store.set(organizationTeamsState, teamWithMember(member));
		store.set(activeTeamIdState, 'team-a');
		store.set(teamTasksState, tasks);
		store.set(teamTasksCompleteState, true);
		const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>;
		renderHook(() => useTeamTasksState(), { wrapper });
		return store;
	}

	beforeEach(() => {
		jest.clearAllMocks();
		mockCookieTaskId = '';
	});

	it('takes the task the member picked, the one the task bar shows, and keeps it for this device', () => {
		const store = renderOnDevice({ activeTaskId: 'task-a' }, [assignedTask('task-b'), assignedTask('task-a')]);

		expect(store.get(activeTeamTaskState)?.id).toBe('task-a');
		expect(mockSetActiveTaskIdCookie).toHaveBeenCalledWith('task-a');
		expect(mockSetActiveUserTaskCookie).toHaveBeenCalledWith({ taskId: 'task-a', userId: 'user-a' });
	});

	it('falls back to the task the member last worked on', () => {
		const store = renderOnDevice({ activeTaskId: null, lastWorkedTask: { id: 'task-b' } }, [
			assignedTask('task-a'),
			assignedTask('task-b')
		]);

		expect(store.get(activeTeamTaskState)?.id).toBe('task-b');
	});

	it('takes the member task once the team detail brings it', () => {
		// The first team response lists the members without their active task
		const store = renderOnDevice({}, [assignedTask('task-a')]);
		expect(store.get(activeTeamTaskState)).toBeNull();

		act(() => {
			store.set(organizationTeamsState, teamWithMember({ activeTaskId: 'task-a' }));
		});

		expect(store.get(activeTeamTaskState)?.id).toBe('task-a');
	});

	it('keeps the task chosen on this device over the member task', () => {
		mockCookieTaskId = 'task-b';
		const store = renderOnDevice({ activeTaskId: 'task-a' }, [assignedTask('task-a'), assignedTask('task-b')]);

		expect(store.get(activeTeamTaskState)?.id).toBe('task-b');
		expect(mockSetActiveTaskIdCookie).not.toHaveBeenCalled();
	});

	it('keeps the member task the timer holds when the loaded list leaves it out', () => {
		// The task bar read the member task on its own: it belongs to another project than the list's default one
		const store = renderOnDevice({ activeTaskId: 'task-a' }, [assignedTask('task-of-the-default-project')]);
		act(() => {
			store.set(activeTeamTaskState, assignedTask('task-a'));
		});

		act(() => {
			store.set(teamTasksState, [assignedTask('task-of-the-default-project'), assignedTask('task-c')]);
		});

		expect(store.get(activeTeamTaskState)?.id).toBe('task-a');
	});

	it('leaves out a task the member is not assigned to, as the task bar does', () => {
		const store = renderOnDevice({ activeTaskId: 'task-a' }, [assignedTask('task-a', ['user-b'])]);

		expect(store.get(activeTeamTaskState)).toBeNull();
		expect(mockSetActiveTaskIdCookie).not.toHaveBeenCalled();
	});
});
