/** @jest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import type { PropsWithChildren } from 'react';

import {
	activeTeamIdState,
	activeTeamTaskState,
	memberActiveTaskIdState,
	organizationTeamsState,
	teamTasksState
} from '@/core/stores';
import type { TTask } from '@/core/types/schemas/task/task.schema';

const mockUpdateTask = jest.fn();
const mockUpdateEmployeeActiveTask = jest.fn();

jest.mock('./use-update-task', () => ({
	useUpdateTask: () => ({ updateTask: mockUpdateTask })
}));

jest.mock('./use-organization-teams-employee', () => ({
	useUpdateEmployeeActiveTask: () => ({
		updateOrganizationTeamEmployeeActiveTask: mockUpdateEmployeeActiveTask
	})
}));

jest.mock('../../queries/user-user.query', () => ({
	useUserQuery: () => ({ data: { id: 'user-me', employee: { id: 'employee-me' } } })
}));

jest.mock('@/core/lib/helpers/index', () => ({
	getActiveTaskIdCookie: jest.fn(() => 'task-previous'),
	getActiveUserTaskCookie: jest.fn(),
	setActiveTaskIdCookie: jest.fn(),
	setActiveUserTaskCookie: jest.fn()
}));

import { useSetActiveTask } from './use-team-tasks-state';

const me = { id: 'employee-me' };
const teammate = { id: 'employee-teammate' };
const previousTask = { id: 'task-previous', organizationId: 'organization-1', members: [me, teammate] } as TTask;
const nextTask = { id: 'task-next', organizationId: 'organization-1', members: [me] } as TTask;

function createSeededStore() {
	const store = createStore();
	store.set(organizationTeamsState, [
		{
			id: 'team-1',
			tenantId: 'tenant-1',
			members: [{ id: 'team-member-me', employeeId: me.id }]
		}
	] as never);
	store.set(activeTeamIdState, 'team-1');
	store.set(teamTasksState, [previousTask, nextTask]);
	store.set(memberActiveTaskIdState, previousTask.id);
	store.set(activeTeamTaskState, previousTask);
	return store;
}

describe('useSetActiveTask', () => {
	it('switches the active task without taking the member off the previous one', async () => {
		mockUpdateEmployeeActiveTask.mockResolvedValue(undefined);
		const store = createSeededStore();
		const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>;
		const { result } = renderHook(() => useSetActiveTask(), { wrapper });

		await act(async () => {
			await result.current.setActiveTask(nextTask);
		});

		expect(mockUpdateTask).not.toHaveBeenCalled();
		const storedPrevious = store.get(teamTasksState).find((task) => task.id === previousTask.id);
		expect(storedPrevious?.members).toEqual([me, teammate]);
		expect(mockUpdateEmployeeActiveTask).toHaveBeenCalledWith(
			'team-member-me',
			expect.objectContaining({ activeTaskId: nextTask.id, organizationTeamId: 'team-1' })
		);
		expect(store.get(activeTeamTaskState)).toEqual(nextTask);
	});
});
