/**
 * @jest-environment jsdom
 */
import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import type { ITaskView } from '@/core/types/interfaces/common/task-views';

const mockSetOrder = jest.fn();
const mockGetView = jest.fn();
const SCOPE = { tenantId: 'tenant', organizationId: 'org', userId: 'user', teamId: 'team' };

jest.mock('@/core/services/client/api/task-views/task-views.service', () => ({
	taskViewsService: {
		setOrder: (...args: unknown[]) => mockSetOrder(...args),
		getView: (...args: unknown[]) => mockGetView(...args)
	}
}));
jest.mock('@/core/services/client/api-error.service', () => ({ ApiErrorService: { isApiError: () => false } }));
jest.mock('./use-task-views-scope', () => ({ useTaskViewsScope: () => SCOPE }));

import { TaskViewConflictError, useTaskViewActions } from './use-task-view-actions';

const SHOWN = ['a', 'b', 'c'];
const viewOf = (version: number, manualOrder: string[]): ITaskView => ({
	id: 'v1',
	name: 'Board',
	version,
	manualOrder
});
/** The platform's refusal of a stale version, with the latest view in it (or not). */
const conflict = (latest?: ITaskView) => ({
	response: { status: 409, data: { code: 'TASK_VIEW_VERSION_CONFLICT', view: latest } }
});
const detailKey = queryKeys.taskViews.detail(SCOPE.tenantId, SCOPE.organizationId, SCOPE.userId, 'v1');

function setup(view: ITaskView) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	client.setQueryData(detailKey, view);
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	const { result } = renderHook(() => useTaskViewActions(), { wrapper });
	return { client, actions: () => result.current };
}

describe('useTaskViewActions, moving a task in a manual order', () => {
	beforeEach(() => {
		mockSetOrder.mockReset();
		mockGetView.mockReset();
	});

	it('shows the move at once and writes the new order with the version the page holds', async () => {
		const view = viewOf(3, ['a', 'b', 'c']);
		const { client, actions } = setup(view);
		let resolveWrite: (saved: ITaskView) => void = () => undefined;
		mockSetOrder.mockReturnValueOnce(new Promise((resolve) => (resolveWrite = resolve)));

		let pending: Promise<unknown> = Promise.resolve();
		await act(async () => {
			pending = actions().moveTask(view, { taskId: 'c', targetId: 'a', edge: 'before' }, SHOWN);
			await Promise.resolve();
		});
		// Shown before the platform answers.
		expect(client.getQueryData<ITaskView>(detailKey)?.manualOrder).toEqual(['c', 'a', 'b']);
		expect(mockSetOrder).toHaveBeenCalledWith('v1', ['c', 'a', 'b'], 3);

		await act(async () => {
			resolveWrite(viewOf(4, ['c', 'a', 'b']));
			await expect(pending).resolves.toEqual({ view: viewOf(4, ['c', 'a', 'b']), statedVersion: 3 });
		});
		expect(client.getQueryData<ITaskView>(detailKey)?.version).toBe(4);
	});

	it('writes moves one after the other, each on the order the one before saved, so a later move is never undone', async () => {
		const view = viewOf(3, ['a', 'b', 'c']);
		const { client, actions } = setup(view);
		let resolveFirst: (saved: ITaskView) => void = () => undefined;
		mockSetOrder
			.mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)))
			.mockResolvedValueOnce(viewOf(5, ['c', 'b', 'a']));

		let first: Promise<unknown> = Promise.resolve();
		let second: Promise<unknown> = Promise.resolve();
		await act(async () => {
			first = actions().moveTask(view, { taskId: 'c', targetId: 'a', edge: 'before' }, SHOWN);
			// The page still shows version 3 when the second move is made.
			second = actions().moveTask(view, { taskId: 'a', targetId: 'b', edge: 'after' }, SHOWN);
			await Promise.resolve();
		});
		// Both moves shown; the second waits for the first.
		expect(client.getQueryData<ITaskView>(detailKey)?.manualOrder).toEqual(['c', 'b', 'a']);
		expect(mockSetOrder).toHaveBeenCalledTimes(1);

		await act(async () => {
			resolveFirst(viewOf(4, ['c', 'a', 'b']));
			await first;
			await second;
		});
		expect(mockSetOrder).toHaveBeenNthCalledWith(2, 'v1', ['c', 'b', 'a'], 4);
		expect(client.getQueryData<ITaskView>(detailKey)).toEqual(viewOf(5, ['c', 'b', 'a']));
	});

	it('sends nothing for a move that changes nothing', async () => {
		const view = viewOf(3, ['a', 'b', 'c']);
		const { actions } = setup(view);
		await act(async () => {
			await expect(
				actions().moveTask(view, { taskId: 'a', targetId: 'b', edge: 'before' }, SHOWN)
			).resolves.toBeNull();
		});
		expect(mockSetOrder).not.toHaveBeenCalled();
	});

	it('after a 409, makes the move again once on the order saved meanwhile, stating its version', async () => {
		const view = viewOf(3, ['a', 'b', 'c']);
		// Someone put b first meanwhile (version 4).
		const latest = viewOf(4, ['b', 'a', 'c']);
		const { client, actions } = setup(view);
		mockSetOrder.mockRejectedValueOnce(conflict(latest)).mockResolvedValueOnce(viewOf(5, ['b', 'c', 'a']));

		await act(async () => {
			const moved = await actions().moveTask(view, { taskId: 'c', targetId: 'a', edge: 'before' }, SHOWN);
			expect(moved).toEqual({ view: viewOf(5, ['b', 'c', 'a']), statedVersion: 4 });
		});
		// Their move kept (b first), and this one (c right before a) made on it.
		expect(mockSetOrder).toHaveBeenNthCalledWith(2, 'v1', ['b', 'c', 'a'], 4);
		expect(client.getQueryData<ITaskView>(detailKey)).toEqual(viewOf(5, ['b', 'c', 'a']));
	});

	it('reads the latest view when the refusal did not carry it', async () => {
		const view = viewOf(3, ['a', 'b', 'c']);
		const { actions } = setup(view);
		mockSetOrder.mockRejectedValueOnce(conflict()).mockResolvedValueOnce(viewOf(5, ['c', 'a', 'b']));
		mockGetView.mockResolvedValueOnce(viewOf(4, ['a', 'b', 'c']));

		await act(async () => {
			await actions().moveTask(view, { taskId: 'c', targetId: 'a', edge: 'before' }, SHOWN);
		});
		expect(mockGetView).toHaveBeenCalledWith('v1');
		expect(mockSetOrder).toHaveBeenNthCalledWith(2, 'v1', ['c', 'a', 'b'], 4);
	});

	it('stops at a second 409: a conflict error, the latest view in the cache', async () => {
		const view = viewOf(3, ['a', 'b', 'c']);
		const latest = viewOf(4, ['b', 'a', 'c']);
		const newest = viewOf(6, ['c', 'b', 'a']);
		const { client, actions } = setup(view);
		mockSetOrder.mockRejectedValueOnce(conflict(latest)).mockRejectedValueOnce(conflict(newest));

		await act(async () => {
			await expect(
				actions().moveTask(view, { taskId: 'c', targetId: 'a', edge: 'before' }, SHOWN)
			).rejects.toBeInstanceOf(TaskViewConflictError);
		});
		expect(mockSetOrder).toHaveBeenCalledTimes(2);
		expect(client.getQueryData<ITaskView>(detailKey)).toEqual(newest);
	});

	it('takes the order saved meanwhile as it is when it already has the task there', async () => {
		const view = viewOf(3, ['a', 'b', 'c']);
		const latest = viewOf(4, ['c', 'a', 'b']);
		const { client, actions } = setup(view);
		mockSetOrder.mockRejectedValueOnce(conflict(latest));

		await act(async () => {
			await expect(
				actions().moveTask(view, { taskId: 'c', targetId: 'a', edge: 'before' }, SHOWN)
			).resolves.toBeNull();
		});
		expect(mockSetOrder).toHaveBeenCalledTimes(1);
		expect(client.getQueryData<ITaskView>(detailKey)).toEqual(latest);
	});

	it('keeps a newer view the cache got meanwhile (a rename) when a move fails', async () => {
		const view = viewOf(3, ['a', 'b', 'c']);
		const { client, actions } = setup(view);
		let failWrite: (reason: unknown) => void = () => undefined;
		mockSetOrder.mockReturnValueOnce(new Promise((_, reject) => (failWrite = reject)));

		let pending: Promise<unknown> = Promise.resolve();
		await act(async () => {
			pending = actions().moveTask(view, { taskId: 'c', targetId: 'a', edge: 'before' }, SHOWN);
			await Promise.resolve();
		});
		// A rename from this tab lands while the move is on its way.
		const renamed = { ...viewOf(4, ['a', 'b', 'c']), name: 'Renamed' };
		act(() => {
			client.setQueryData(detailKey, renamed);
		});
		await act(async () => {
			failWrite({ response: { status: 500 } });
			await expect(pending).rejects.toEqual({ response: { status: 500 } });
		});
		expect(client.getQueryData<ITaskView>(detailKey)).toEqual(renamed);
	});

	it('keeps a newer view the cache got before the order was answered (a rename saved after it)', async () => {
		const view = viewOf(3, ['a', 'b', 'c']);
		const { client, actions } = setup(view);
		let resolveWrite: (saved: ITaskView) => void = () => undefined;
		mockSetOrder.mockReturnValueOnce(new Promise((resolve) => (resolveWrite = resolve)));

		let pending: Promise<unknown> = Promise.resolve();
		await act(async () => {
			pending = actions().moveTask(view, { taskId: 'c', targetId: 'a', edge: 'before' }, SHOWN);
			await Promise.resolve();
		});
		// The order committed as version 4, a rename as version 5, and the rename was answered first.
		const renamed = { ...viewOf(5, ['c', 'a', 'b']), name: 'Renamed' };
		act(() => {
			client.setQueryData(detailKey, renamed);
		});
		await act(async () => {
			resolveWrite(viewOf(4, ['c', 'a', 'b']));
			await pending;
		});
		expect(client.getQueryData<ITaskView>(detailKey)).toEqual(renamed);
	});

	it('puts back the order the page showed when the write fails for another reason', async () => {
		const view = viewOf(3, ['a', 'b', 'c']);
		const { client, actions } = setup(view);
		const failure = { response: { status: 500 } };
		mockSetOrder.mockRejectedValueOnce(failure);

		await act(async () => {
			await expect(actions().moveTask(view, { taskId: 'c', targetId: 'a', edge: 'before' }, SHOWN)).rejects.toBe(
				failure
			);
		});
		expect(client.getQueryData<ITaskView>(detailKey)).toEqual(view);
	});
});
