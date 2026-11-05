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
