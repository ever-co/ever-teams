/**
 * @jest-environment jsdom
 */
import React from 'react';
import { act } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

const mockList = jest.fn();
const mockDeleteForever = jest.fn();

jest.mock('@/core/services/client/api/tasks/task-trash.service', () => ({
	TASK_TRASH_PAGE_SIZE: 50,
	taskTrashService: {
		list: (...args: unknown[]) => mockList(...args),
		restore: jest.fn(),
		deleteForever: (...args: unknown[]) => mockDeleteForever(...args)
	}
}));
jest.mock('@/core/lib/utils/comments-trash-flags', () => ({ isTaskTrashEnabled: () => true }));
jest.mock('@/core/lib/utils/task-discussion', () => {
	const actual = jest.requireActual('@/core/lib/utils/task-discussion');
	return { ...actual, taskDiscussionScope: () => ({ tenantId: 'ten', organizationId: 'org' }) };
});

import { useTaskTrash } from './use-task-trash';

const scope = { tenantId: 'ten', organizationId: 'org' };
const trashed = (id: string) => ({ id, title: `Task ${id}`, deletedAt: '2026-11-10T08:00:00.000Z' });

function wrapper(client: QueryClient) {
	return function Wrapper({ children }: { children: React.ReactNode }) {
		return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
	};
}

async function renderTrash() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const hook = renderHook(() => useTaskTrash({ teamId: 'team-1', projectId: null, search: '' }), {
		wrapper: wrapper(client)
	});
	await waitFor(() => expect(hook.result.current.status).toBe('ready'));
	return hook;
}

/**
 * Delete forever, from the trash only: the platform deletes a task only while it is still in the trash, and answers
 * 404 for one someone restored (or deleted) since the list was read. The hook tells the page which happened.
 */
describe('useTaskTrash — Delete forever', () => {
	beforeEach(() => {
		mockList.mockReset();
		mockDeleteForever.mockReset();
		mockList.mockResolvedValue({ items: [trashed('t1'), trashed('t2')], total: 2 });
	});

	it('deletes a task from the trash of the signed-in organization, and reads the list again', async () => {
		const { result } = await renderTrash();
		mockDeleteForever.mockResolvedValue({ raw: [], affected: 1 });
		mockList.mockResolvedValue({ items: [trashed('t2')], total: 1 });

		let outcome: string | undefined;
		await act(async () => {
			outcome = await result.current.deleteForever(trashed('t1'));
		});

		expect(outcome).toBe('deleted');
		expect(mockDeleteForever).toHaveBeenCalledWith('t1', scope);
		await waitFor(() => expect(result.current.tasks.map((task) => task.id)).toEqual(['t2']));
	});

	it('answers not-in-trash for a task someone restored meanwhile, and reads the list again', async () => {
		const { result } = await renderTrash();
		const reads = mockList.mock.calls.length;
		mockDeleteForever.mockRejectedValue({ response: { status: 404 } });
		// The list as it is now: the restored task left it.
		mockList.mockResolvedValue({ items: [trashed('t2')], total: 1 });

		let outcome: string | undefined;
		await act(async () => {
			outcome = await result.current.deleteForever(trashed('t1'));
		});

		expect(outcome).toBe('not-in-trash');
		expect(mockList.mock.calls.length).toBeGreaterThan(reads);
		await waitFor(() => expect(result.current.tasks.map((task) => task.id)).toEqual(['t2']));
	});

	it('answers still-linked when other records still point at the task, and leaves the list as it was', async () => {
		const { result } = await renderTrash();
		const reads = mockList.mock.calls.length;
		mockDeleteForever.mockRejectedValue({ response: { status: 409 } });

		let outcome: string | undefined;
		await act(async () => {
			outcome = await result.current.deleteForever(trashed('t1'));
		});

		expect(outcome).toBe('still-linked');
		expect(mockList.mock.calls).toHaveLength(reads);
	});

	it('answers failed for any other refusal, and leaves the list as it was', async () => {
		const { result } = await renderTrash();
		const reads = mockList.mock.calls.length;
		mockDeleteForever.mockRejectedValue({ response: { status: 403 } });

		let outcome: string | undefined;
		await act(async () => {
			outcome = await result.current.deleteForever(trashed('t1'));
		});

		expect(outcome).toBe('failed');
		expect(mockList.mock.calls).toHaveLength(reads);
		expect(result.current.tasks.map((task) => task.id)).toEqual(['t1', 't2']);
	});
});
