/** @jest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import type { TOrganizationTeamEmployee } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { useTeamMemberMutations } from './use-team-member-mutations';

const mockUpdateTask = jest.fn(async () => undefined);
const mockUnassignAuthActiveTask = jest.fn();
const mockAtomValues: Record<string, unknown> = {};

jest.mock('@/core/stores', () => ({ activeTeamTaskState: 'active-team-task', tasksByTeamState: 'tasks-by-team' }));
jest.mock('jotai', () => ({ useAtomValue: (atom: string) => mockAtomValues[atom] }));
jest.mock('./use-update-task', () => ({ useUpdateTask: () => ({ updateTask: mockUpdateTask }) }));
jest.mock('./use-delete-task', () => ({
	useDeleteTask: () => ({ unassignAuthActiveTask: mockUnassignAuthActiveTask })
}));
jest.mock('./use-team-tasks-state', () => ({ useSetActiveTask: () => ({ setActiveTask: jest.fn() }) }));
jest.mock('../../queries/user-user.query', () => ({ useUserQuery: () => ({ data: { id: 'user-viewer' } }) }));

/**
 * Unassigning a task from one's own profile cleared the active task whatever the task was, so the running timer
 * stopped with "the current task changed". Only leaving the active task itself clears it now.
 */
describe('useTeamMemberMutations.unassignTask for the viewer', () => {
	const viewer = {
		employeeId: 'employee-viewer',
		employee: { userId: 'user-viewer', user: { id: 'user-viewer' } }
	} as unknown as TOrganizationTeamEmployee;
	const activeTask = { id: 'task-active', members: [{ id: 'employee-viewer' }] } as unknown as TTask;
	const otherTask = { id: 'task-other', members: [{ id: 'employee-viewer' }] } as unknown as TTask;

	beforeEach(() => {
		mockAtomValues['tasks-by-team'] = [activeTask, otherTask];
		mockAtomValues['active-team-task'] = activeTask;
	});

	it('leaves the active task, and its timer, alone when another task is unassigned', async () => {
		const { result } = renderHook(() => useTeamMemberMutations(viewer));

		await act(() => result.current.unassignTask(otherTask));

		expect(mockUpdateTask).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-other', members: [] }));
		expect(mockUnassignAuthActiveTask).not.toHaveBeenCalled();
	});

	it('clears the active task when that very task is unassigned', async () => {
		const { result } = renderHook(() => useTeamMemberMutations(viewer));

		await act(() => result.current.unassignTask(activeTask));

		expect(mockUnassignAuthActiveTask).toHaveBeenCalledTimes(1);
	});
});
