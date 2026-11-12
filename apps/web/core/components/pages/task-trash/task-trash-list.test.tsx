/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { toast } from 'sonner';
import type { TaskTrashDeleteOutcome } from '@/core/lib/utils/task-trash';

const mockDeleteForever = jest.fn();

const trashed = (id: string) => ({ id, title: `Task ${id}`, deletedAt: '2026-11-10T08:00:00.000Z' });

jest.mock('@/core/hooks/tasks/use-task-trash', () => ({
	useTaskTrash: () => ({
		status: 'ready',
		tasks: [trashed('t1'), trashed('t2')],
		total: 2,
		hasMore: false,
		isLoadingMore: false,
		loadMore: jest.fn(),
		retry: jest.fn(),
		restore: jest.fn(),
		deleteForever: (task: unknown) => mockDeleteForever(task)
	})
}));
jest.mock('@/core/hooks/tasks/use-task-drawer', () => ({ useTaskDrawer: () => ({ openTaskDrawer: jest.fn() }) }));

// The confirmation as a plain dialog: its own rendering is not under test here.
jest.mock('@/core/components/common/alert-dialog-confirmation', () => ({
	AlertDialogConfirmation: (props: { isOpen: boolean; loading?: boolean; onConfirm: () => void }) =>
		props.isOpen ? (
			<button type="button" data-testid="confirm-delete" disabled={props.loading} onClick={props.onConfirm}>
				confirm
			</button>
		) : null
}));

// A message is its key followed by its values, so a toast names the message it shows.
jest.mock('next-intl', () => ({
	useLocale: () => 'en',
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values ? `${key} ${JSON.stringify(values)}` : key
}));

jest.mock('sonner', () => ({
	toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), warning: jest.fn() })
}));

import { TaskTrashList } from './task-trash-list';

const toastMock = toast as unknown as jest.Mock & { error: jest.Mock; warning: jest.Mock };

/** Opens the confirmation of the first task's Delete forever and confirms it. */
async function deleteFirstTask() {
	render(<TaskTrashList teamId="team-1" projectId={null} />);
	fireEvent.click(screen.getAllByRole('button', { name: 'taskTrash.DELETE_FOREVER' })[0]);
	await act(async () => {
		fireEvent.click(screen.getByTestId('confirm-delete'));
	});
}

describe('TaskTrashList — Delete forever', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('deletes the task once confirmed, and says so', async () => {
		mockDeleteForever.mockResolvedValue('deleted');

		await deleteFirstTask();

		expect(mockDeleteForever).toHaveBeenCalledTimes(1);
		expect(mockDeleteForever).toHaveBeenCalledWith(trashed('t1'));
		expect(toastMock).toHaveBeenCalledWith('taskTrash.DELETED_FOREVER {"title":"Task t1"}');
		expect(screen.queryByTestId('confirm-delete')).toBeNull();
	});

	it('says the task is no longer in the trash when someone restored or deleted it meanwhile', async () => {
		mockDeleteForever.mockResolvedValue('not-in-trash');

		await deleteFirstTask();

		expect(toastMock.warning).toHaveBeenCalledWith('taskTrash.NO_LONGER_IN_TRASH {"title":"Task t1"}');
		expect(toastMock.error).not.toHaveBeenCalled();
		expect(toastMock).not.toHaveBeenCalled();
		expect(screen.queryByTestId('confirm-delete')).toBeNull();
	});

	it('says the task stays in the trash while other records are still linked to it', async () => {
		mockDeleteForever.mockResolvedValue('still-linked');

		await deleteFirstTask();

		expect(toastMock.error).toHaveBeenCalledWith('taskTrash.STILL_LINKED {"title":"Task t1"}');
		expect(toastMock.warning).not.toHaveBeenCalled();
		expect(toastMock).not.toHaveBeenCalled();
	});

	it('says the delete failed when the platform refused it', async () => {
		mockDeleteForever.mockResolvedValue('failed');

		await deleteFirstTask();

		expect(toastMock.error).toHaveBeenCalledWith('taskTrash.DELETE_FAILED');
		expect(toastMock.warning).not.toHaveBeenCalled();
	});

	it('keeps the row busy while the delete runs: its buttons and the confirmation are disabled, and it runs once', async () => {
		let finish: (outcome: TaskTrashDeleteOutcome) => void = () => undefined;
		mockDeleteForever.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
		render(<TaskTrashList teamId="team-1" projectId={null} />);
		fireEvent.click(screen.getAllByRole('button', { name: 'taskTrash.DELETE_FOREVER' })[0]);

		await act(async () => {
			fireEvent.click(screen.getByTestId('confirm-delete'));
		});
		const isDisabled = (element: HTMLElement) => (element as HTMLButtonElement).disabled;
		expect(isDisabled(screen.getByTestId('confirm-delete'))).toBe(true);
		expect(isDisabled(screen.getAllByRole('button', { name: 'taskTrash.RESTORE' })[0])).toBe(true);
		expect(isDisabled(screen.getAllByRole('button', { name: 'taskTrash.DELETE_FOREVER' })[0])).toBe(true);
		// The other task's buttons stay usable.
		expect(isDisabled(screen.getAllByRole('button', { name: 'taskTrash.RESTORE' })[1])).toBe(false);
		fireEvent.click(screen.getByTestId('confirm-delete'));
		expect(mockDeleteForever).toHaveBeenCalledTimes(1);

		await act(async () => {
			finish('deleted');
		});
		expect(screen.queryByTestId('confirm-delete')).toBeNull();
	});
});
