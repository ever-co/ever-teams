/**
 * @jest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import type { ITaskView, ITaskViewDefinition } from '@/core/types/interfaces/common/task-views';

const mockSaveDefinition = jest.fn();
const mockUpdateView = jest.fn();
const mockDeleteView = jest.fn();
const mockMoveTask = jest.fn();
const mockCreateView = jest.fn();
const mockPush = jest.fn();

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@/core/lib/utils/task-views-enabled', () => ({ isTaskViewsEnabled: () => true }));
jest.mock('@/core/hooks/task-views/use-task-view-actions', () => {
	class TaskViewConflictError extends Error {
		constructor(public readonly latest: unknown) {
			super('TASK_VIEW_VERSION_CONFLICT');
		}
	}
	return {
		TaskViewConflictError,
		useTaskViewActions: () => ({
			saveDefinition: mockSaveDefinition,
			createView: mockCreateView,
			updateView: mockUpdateView,
			moveTask: mockMoveTask,
			deleteView: mockDeleteView
		})
	};
});

import { toast } from 'sonner';
import { TaskViewConflictError } from '@/core/hooks/task-views/use-task-view-actions';
import { useSavedViewCommands } from './use-saved-view-commands';

const MINE = { groupBy: 'status' } as unknown as ITaskViewDefinition;
const viewAt = (version: number): ITaskView => ({ id: 'v1', name: 'Board', version }) as unknown as ITaskView;

type Props = { savedView: ITaskView; isDirty: boolean };

function render(initial: Props) {
	return renderHook(
		(props: Props) =>
			useSavedViewCommands({ ...props, isBuiltIn: false, definition: MINE, applyDefinition: jest.fn() }),
		{
			initialProps: initial
		}
	);
}

/** The version the last save stated. */
const statedVersion = (): number | undefined =>
	(mockSaveDefinition.mock.calls.at(-1)?.[0] as ITaskView | undefined)?.version;

describe('useSavedViewCommands, saving a changed view', () => {
	beforeEach(() => {
		mockSaveDefinition.mockReset().mockResolvedValue(viewAt(9));
		mockUpdateView.mockReset();
	});

	it('states the version the change was made on, also once a newer version reached the page (a conflict, a refetch)', async () => {
		const view = render({ savedView: viewAt(1), isDirty: false });
		// The person changes the view on version 1; then version 2 (someone else's save) reaches the cache.
		view.rerender({ savedView: viewAt(1), isDirty: true });
		view.rerender({ savedView: viewAt(2), isDirty: true });

		await act(async () => view.result.current.toolbarCommands.save());

		// Version 1: the platform answers a conflict instead of letting the change overwrite version 2.
		expect(statedVersion()).toBe(1);
	});

	it('states the newer version once the page shows it (a Reload), and the change is made on it', async () => {
		const view = render({ savedView: viewAt(1), isDirty: true });
		// Reload: the page shows version 2 unchanged; then the person changes it again.
		view.rerender({ savedView: viewAt(2), isDirty: false });
		view.rerender({ savedView: viewAt(2), isDirty: true });

		await act(async () => view.result.current.toolbarCommands.save());

		expect(statedVersion()).toBe(2);
	});

	it('builds on what this tab wrote: a share made on the same version, then edits while a save ran', async () => {
		const view = render({ savedView: viewAt(1), isDirty: false });
		view.rerender({ savedView: viewAt(1), isDirty: true });
		// Shared from here on version 1 → version 2 (the page still shows the change).
		mockUpdateView.mockResolvedValueOnce(viewAt(2));
		await act(async () => view.result.current.toolbarCommands.toggleVisibility());
		view.rerender({ savedView: viewAt(2), isDirty: true });
		mockSaveDefinition.mockResolvedValueOnce(viewAt(3));
		await act(async () => view.result.current.toolbarCommands.save());
		expect(statedVersion()).toBe(2);
		// Edited again while that save ran: the next save states the version it wrote.
		view.rerender({ savedView: viewAt(3), isDirty: true });
		await act(async () => view.result.current.toolbarCommands.save());
		expect(statedVersion()).toBe(3);
	});

	it("never adopts someone else's version through this tab's write made on it", async () => {
		const view = render({ savedView: viewAt(1), isDirty: false });
		view.rerender({ savedView: viewAt(1), isDirty: true });
		// Someone else saved version 2; this tab shares it (version 3): the change still builds on version 1.
		view.rerender({ savedView: viewAt(2), isDirty: true });
		mockUpdateView.mockResolvedValueOnce(viewAt(3));
		await act(async () => view.result.current.toolbarCommands.toggleVisibility());
		view.rerender({ savedView: viewAt(3), isDirty: true });
		await act(async () => view.result.current.toolbarCommands.save());
		expect(statedVersion()).toBe(1);
	});
});

describe('useSavedViewCommands, deleting the open view and naming a new one', () => {
	beforeEach(() => {
		mockDeleteView.mockReset().mockResolvedValue(undefined);
		mockPush.mockReset();
	});

	it("asks in the page's dialog before deleting, never in the browser's confirm box", async () => {
		const confirmSpy = jest.spyOn(window, 'confirm');
		const { result } = render({ savedView: viewAt(3), isDirty: false });

		act(() => result.current.toolbarCommands.remove());

		expect(result.current.isDeleteConfirmOpen).toBe(true);
		expect(mockDeleteView).not.toHaveBeenCalled();
		expect(confirmSpy).not.toHaveBeenCalled();

		await act(async () => result.current.confirmRemove());

		expect(mockDeleteView).toHaveBeenCalledWith(viewAt(3));
		expect(mockPush).toHaveBeenCalledWith('/views');
		expect(result.current.isDeleteConfirmOpen).toBe(false);
		confirmSpy.mockRestore();
	});

	it('keeps the view when the dialog is closed', () => {
		const { result } = render({ savedView: viewAt(3), isDirty: false });

		act(() => result.current.toolbarCommands.remove());
		act(() => result.current.closeDeleteConfirm());

		expect(result.current.isDeleteConfirmOpen).toBe(false);
		expect(mockDeleteView).not.toHaveBeenCalled();
	});

	it('opens with the dialog that names a new view, for "New view" of the views index', () => {
		const { result } = renderHook(() =>
			useSavedViewCommands({
				savedView: null,
				isBuiltIn: false,
				definition: MINE,
				isDirty: false,
				applyDefinition: jest.fn(),
				initialDialog: 'create'
			})
		);

		expect(result.current.saveDialog).toBe('create');
	});
});

describe('useSavedViewCommands, moving a task in the manual order', () => {
	const MOVE = { taskId: 'c', targetId: 'a', edge: 'before' as const };
	const SHOWN = ['a', 'b', 'c'];

	beforeEach(() => {
		mockSaveDefinition.mockReset().mockResolvedValue(viewAt(9));
		mockMoveTask.mockReset();
	});

	it('moves the task in the open view, with the order the list shows', async () => {
		mockMoveTask.mockResolvedValueOnce({ view: viewAt(2), statedVersion: 1 });
		const view = render({ savedView: viewAt(1), isDirty: false });

		await act(async () => view.result.current.moveTask(MOVE, SHOWN));

		expect(mockMoveTask).toHaveBeenCalledWith(viewAt(1), MOVE, SHOWN);
	});

	it('lets a change in progress build on the version the move wrote, as after a rename', async () => {
		const view = render({ savedView: viewAt(1), isDirty: false });
		view.rerender({ savedView: viewAt(1), isDirty: true });
		mockMoveTask.mockResolvedValueOnce({ view: viewAt(2), statedVersion: 1 });
		await act(async () => view.result.current.moveTask(MOVE, SHOWN));
		view.rerender({ savedView: viewAt(2), isDirty: true });

		await act(async () => view.result.current.toolbarCommands.save());

		expect(statedVersion()).toBe(2);
	});

	it('never adopts a version someone else saved when the move was made again on it (after a 409)', async () => {
		const view = render({ savedView: viewAt(1), isDirty: false });
		view.rerender({ savedView: viewAt(1), isDirty: true });
		// Someone saved version 2; the move was refused, made again on version 2, and wrote version 3.
		mockMoveTask.mockResolvedValueOnce({ view: viewAt(3), statedVersion: 2 });
		await act(async () => view.result.current.moveTask(MOVE, SHOWN));
		view.rerender({ savedView: viewAt(3), isDirty: true });

		await act(async () => view.result.current.toolbarCommands.save());

		// The change was made on version 1: its save meets their version as a conflict.
		expect(statedVersion()).toBe(1);
	});

	it('says why a move did not land: someone reordered at the same time, or it failed', async () => {
		const view = render({ savedView: viewAt(1), isDirty: false });
		mockMoveTask.mockRejectedValueOnce(new TaskViewConflictError(viewAt(2)));
		await act(async () => view.result.current.moveTask(MOVE, SHOWN));
		expect(toast.error).toHaveBeenLastCalledWith('taskViews.ORDER_CONFLICT');

		mockMoveTask.mockRejectedValueOnce(new Error('offline'));
		await act(async () => view.result.current.moveTask(MOVE, SHOWN));
		expect(toast.error).toHaveBeenLastCalledWith('taskViews.ORDER_FAILED');
	});

	it('keeps the manual order of the view a new one is saved from', async () => {
		mockCreateView.mockReset().mockResolvedValueOnce({ id: 'v2', name: 'Copy' });
		const source = { ...viewAt(4), manualOrder: ['c', 'a'] } as ITaskView;
		const { result } = renderHook(() =>
			useSavedViewCommands({
				savedView: source,
				isBuiltIn: false,
				definition: MINE,
				isDirty: false,
				applyDefinition: jest.fn(),
				initialDialog: 'create'
			})
		);

		await act(async () => {
			await result.current.submitDialog('Copy', 'personal' as never);
		});

		expect(mockCreateView).toHaveBeenCalledWith('Copy', 'personal', MINE, ['c', 'a']);
		expect(mockPush).toHaveBeenCalledWith('/views/v2');
	});
});
