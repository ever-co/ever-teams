/** @jest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import type { TTaskStatus } from '@/core/types/schemas';

const mockReorder = jest.fn();
const mockSetTaskStatuses = jest.fn();
let mockStatuses: Partial<TTaskStatus>[] = [];

jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: { tenantId: 'tenant-1', employee: { organizationId: 'org-1' } } })
}));
jest.mock('@/core/hooks/tasks/use-task-statuses-query', () => ({
	useTaskStatusesQuery: () => ({
		taskStatuses: mockStatuses,
		loading: false,
		isError: false,
		refetch: jest.fn(),
		setTaskStatuses: mockSetTaskStatuses
	})
}));
jest.mock('@/core/hooks/tasks/use-create-task-status', () => ({
	useCreateTaskStatus: () => ({ createTaskStatus: jest.fn() })
}));
jest.mock('@/core/hooks/tasks/use-edit-task-status', () => ({
	useEditTaskStatus: () => ({ editTaskStatus: jest.fn() })
}));
jest.mock('@/core/hooks/tasks/use-reorder-task-status', () => ({
	useReorderTaskStatus: () => ({ reOrderTaskStatus: mockReorder })
}));
jest.mock('@/core/lib/helpers/cookies', () => ({ getOrganizationIdCookie: () => 'org-1' }));

import { useStatusSettings } from './use-status-settings';

const BUILT_IN = { isSystem: true, organizationTeamId: null };
const OWN = { isSystem: false, organizationTeamId: 'team-1' };

describe('useStatusSettings, moving a status (#5359)', () => {
	beforeEach(() => {
		mockReorder.mockReset().mockResolvedValue({ success: true, list: [] });
		mockSetTaskStatuses.mockReset();
	});

	it("sends the order of the team's own statuses only, never a built-in one", async () => {
		mockStatuses = [
			{ id: 'mine-first', name: 'mine-first', order: 0, ...OWN },
			{ id: 'built-in', name: 'blocked', order: 5, ...BUILT_IN },
			{ id: 'mine-second', name: 'mine-second', order: 6, ...OWN },
			{ id: 'mine-third', name: 'mine-third', order: 7, ...OWN }
		];
		const { result } = renderHook(() => useStatusSettings());

		await act(() => result.current.move(['mine-first', 'built-in', 'mine-third', 'mine-second']));

		expect(mockReorder).toHaveBeenCalledWith({
			organizationId: 'org-1',
			reorder: [
				{ id: 'mine-first', order: 0 },
				{ id: 'mine-third', order: 6 },
				{ id: 'mine-second', order: 7 }
			]
		});
	});

	it('sends nothing for a team that still uses the built-in statuses: Gauzy would refuse it', async () => {
		mockStatuses = [
			{ id: 'open', name: 'open', order: 0, ...BUILT_IN },
			{ id: 'blocked', name: 'blocked', order: 1, ...BUILT_IN },
			{ id: 'done', name: 'done', order: 2, ...BUILT_IN }
		];
		const { result } = renderHook(() => useStatusSettings());

		await act(() => result.current.move(['blocked', 'open', 'done']));

		expect(mockReorder).not.toHaveBeenCalled();
		expect(mockSetTaskStatuses).not.toHaveBeenCalled();
		expect(result.current.canMove(['blocked', 'open', 'done'])).toBe(false);
	});

	it('still saves every move of a team with its own statuses only', async () => {
		mockStatuses = [
			{ id: 'todo', name: 'todo', order: 0, ...OWN },
			{ id: 'doing', name: 'doing', order: 1, ...OWN }
		];
		const { result } = renderHook(() => useStatusSettings());

		expect(result.current.canMove(['doing', 'todo'])).toBe(true);
		await act(() => result.current.move(['doing', 'todo']));

		expect(mockReorder).toHaveBeenCalledWith({
			organizationId: 'org-1',
			reorder: [
				{ id: 'doing', order: 0 },
				{ id: 'todo', order: 1 }
			]
		});
	});
});
