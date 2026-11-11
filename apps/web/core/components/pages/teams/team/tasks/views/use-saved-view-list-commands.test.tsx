/** @jest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { ETaskViewVisibility, type ITaskView } from '@/core/types/interfaces/common/task-views';

const mockUpdateView = jest.fn();
const mockDeleteView = jest.fn();
const mockToastError = jest.fn();

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
// Read when a toast is shown, after this file's set-up ran
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: (...args: unknown[]) => mockToastError(...args) } }));
jest.mock('@/core/hooks/task-views/use-task-view-actions', () => {
	class TaskViewConflictError extends Error {}
	return {
		TaskViewConflictError,
		useTaskViewActions: () => ({ updateView: mockUpdateView, deleteView: mockDeleteView })
	};
});

import { TaskViewConflictError } from '@/core/hooks/task-views/use-task-view-actions';
import { useSavedViewListCommands } from './use-saved-view-list-commands';

const VIEW: ITaskView = { id: 'v1', name: 'Bugs this sprint', visibility: ETaskViewVisibility.PERSONAL, version: 4 };

describe('useSavedViewListCommands', () => {
	beforeEach(() => {
		mockUpdateView.mockReset().mockResolvedValue({ ...VIEW, version: 5 });
		mockDeleteView.mockReset().mockResolvedValue(undefined);
		mockToastError.mockReset();
	});

	it('renames the view picked from the list, and keeps the dialog open when it fails', async () => {
		const { result } = renderHook(() => useSavedViewListCommands());
		act(() => result.current.startRename(VIEW));

		let renamed = false;
		await act(async () => {
			renamed = await result.current.rename('Bugs');
		});
		expect(renamed).toBe(true);
		expect(mockUpdateView).toHaveBeenCalledWith(VIEW, { name: 'Bugs' });

		mockUpdateView.mockRejectedValueOnce(new Error('offline'));
		await act(async () => {
			renamed = await result.current.rename('Bugs again');
		});
		expect(renamed).toBe(false);
		expect(mockToastError).toHaveBeenCalledWith('taskViews.SAVE_FAILED');
	});

	it('shares a personal view with the team, and says when someone changed it meanwhile', async () => {
		const { result } = renderHook(() => useSavedViewListCommands());

		await act(async () => result.current.toggleVisibility(VIEW));
		expect(mockUpdateView).toHaveBeenCalledWith(VIEW, { visibility: ETaskViewVisibility.SHARED });

		mockUpdateView.mockRejectedValueOnce(new TaskViewConflictError(null));
		await act(async () => result.current.toggleVisibility(VIEW));
		expect(mockToastError).toHaveBeenCalledWith('taskViews.CONFLICT_IN_LIST');
	});

	it('deletes a view only once its deletion is confirmed', async () => {
		const { result } = renderHook(() => useSavedViewListCommands());

		act(() => result.current.startDelete(VIEW));
		expect(result.current.deleting).toBe(VIEW);
		expect(mockDeleteView).not.toHaveBeenCalled();

		await act(async () => result.current.confirmDelete());

		expect(mockDeleteView).toHaveBeenCalledWith(VIEW);
		expect(result.current.deleting).toBeNull();
	});
});
