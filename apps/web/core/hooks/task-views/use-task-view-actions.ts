'use client';

import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { taskViewsService } from '@/core/services/client/api/task-views/task-views.service';
import { columnsOf } from '@/core/lib/utils/task-views';
import { orderAfterMove, type TaskOrderMove } from '@/core/lib/utils/task-view-order';
import {
	ETaskViewVisibility,
	type ITaskView,
	type ITaskViewDefinition,
	type ITaskViewUpdateInput
} from '@/core/types/interfaces/common/task-views';
import { useTaskViewsScope } from './use-task-views-scope';

/** The platform refused a save because the view moved on since it was read. */
export class TaskViewConflictError extends Error {
	constructor(public readonly latest: ITaskView | null) {
		super('TASK_VIEW_VERSION_CONFLICT');
		this.name = 'TaskViewConflictError';
	}
}

function conflictOf(error: unknown): TaskViewConflictError | null {
	const response = (error as { response?: { status?: number; data?: { code?: string; view?: ITaskView } } } | null)?.response;
	if (response?.status === 409) return new TaskViewConflictError(response.data?.view ?? null);
	// The request layer answers an HTTP error as an ApiErrorService: the status survives, the body's extras may not.
	if (ApiErrorService.isApiError(error) && (error.statusCode === 409 || error.hasHttpResponseStatus(409))) {
		return new TaskViewConflictError((error.details?.view as ITaskView | undefined) ?? null);
	}
	return null;
}

/** A move that reached the platform: the view it saved, and the version the write stated. */
interface TaskViewMoveResult {
	view: ITaskView;
	statedVersion: ITaskView['version'];
}

/** A move waiting for its write. */
interface PendingMove {
	move: TaskOrderMove;
	shownIds: readonly string[];
}

/** The moves of one view, written one after the other. */
interface MoveQueue {
	tail: Promise<void>;
	/** The view as the platform last answered it. */
	confirmed: ITaskView;
	pending: PendingMove[];
}

/** The order the platform holds with the moves still on their way made on it. */
function pendingOrderOf(queue: MoveQueue): string[] {
	let order = [...(queue.confirmed.manualOrder ?? [])];
	for (const { move, shownIds } of queue.pending) {
		order = orderAfterMove(order, shownIds, move) ?? order;
	}
	return order;
}

/** The conflict with the latest view in it: read again when the refusal did not carry it. */
async function withLatest(conflict: TaskViewConflictError, viewId: string): Promise<TaskViewConflictError> {
	if (conflict.latest) return conflict;
	const latest = await taskViewsService.getView(viewId).catch(() => null);
	return new TaskViewConflictError(latest);
}

/**
 * Creating, saving, renaming, sharing, ordering and deleting the views of the active team. A save states the version
 * the page read; a stale one is a {@link TaskViewConflictError} with the latest view, nothing overwritten.
 */
export function useTaskViewActions() {
	const scope = useTaskViewsScope();
	const queryClient = useQueryClient();

	const settle = useCallback(
		(view?: ITaskView | null) => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.taskViews.all });
			if (view?.id && scope) {
				queryClient.setQueryData(queryKeys.taskViews.detail(scope.tenantId, scope.organizationId, scope.userId, view.id), view);
			}
		},
		[queryClient, scope]
	);

	const createView = useCallback(
		async (
			name: string,
			visibility: ETaskViewVisibility,
			definition: ITaskViewDefinition,
			manualOrder?: readonly string[] | null
		): Promise<ITaskView> => {
			if (!scope) throw new Error('No team');
			const view = await taskViewsService.create({
				name,
				visibility,
				organizationTeamId: scope.teamId,
				...columnsOf(definition),
				...(manualOrder?.length ? { manualOrder: [...manualOrder] } : {})
			});
			settle(view);
			return view;
		},
		[scope, settle]
	);

	const saveDefinition = useCallback(
		async (view: ITaskView, definition: ITaskViewDefinition): Promise<ITaskView> => {
			try {
				const saved = await taskViewsService.update(view.id, { ...columnsOf(definition), expectedVersion: view.version });
				settle(saved);
				return saved;
			} catch (error) {
				const conflict = conflictOf(error);
				if (conflict) {
					const known = await withLatest(conflict, view.id);
					settle(known.latest);
					throw known;
				}
				throw error;
			}
		},
		[settle]
	);

	const updateView = useCallback(
		async (view: ITaskView, input: Omit<ITaskViewUpdateInput, 'expectedVersion'>): Promise<ITaskView> => {
			try {
				const saved = await taskViewsService.update(view.id, { ...input, expectedVersion: view.version });
				settle(saved);
				return saved;
			} catch (error) {
				const conflict = conflictOf(error);
				if (conflict) {
					const known = await withLatest(conflict, view.id);
					settle(known.latest);
					throw known;
				}
				throw error;
			}
		},
		[settle]
	);

	// One queue of moves per view: each write waits for the one before it and starts from the order it saved, so a
	// later move is never undone by an earlier one answered after it.
	const queuesRef = useRef(new Map<string, MoveQueue>());

	const detailKeyOf = useCallback(
		(viewId: string) =>
			scope ? queryKeys.taskViews.detail(scope.tenantId, scope.organizationId, scope.userId, viewId) : null,
		[scope]
	);

	/**
	 * A newer view the cache got meanwhile (a rename or a save from this tab, a refetch) becomes the one the moves
	 * start from: the queue never puts an older version back.
	 */
	const adoptNewer = useCallback(
		(queue: MoveQueue) => {
			const key = detailKeyOf(queue.confirmed.id);
			const cached = key ? queryClient.getQueryData<ITaskView>(key) : undefined;
			if (cached && (cached.version ?? 0) > (queue.confirmed.version ?? 0)) queue.confirmed = cached;
		},
		[detailKeyOf, queryClient]
	);

	/** Shows the order the platform holds with the moves still on their way made on it. */
	const showQueue = useCallback(
		(queue: MoveQueue) => {
			const key = detailKeyOf(queue.confirmed.id);
			if (!key) return;
			adoptNewer(queue);
			// A read under way would answer an order without the moves.
			void queryClient.cancelQueries({ queryKey: key });
			queryClient.setQueryData(key, { ...queue.confirmed, manualOrder: pendingOrderOf(queue) });
		},
		[adoptNewer, detailKeyOf, queryClient]
	);

	/** Writes one queued move on the order the platform holds; a 409 makes it once more on the order saved meanwhile. */
	const writeMove = useCallback(
		async (queue: MoveQueue, entry: PendingMove): Promise<TaskViewMoveResult | null> => {
			adoptNewer(queue);
			const base = queue.confirmed;
			const order = orderAfterMove(base.manualOrder, entry.shownIds, entry.move);
			if (!order) return null;
			const write = async (taskIds: string[], statedVersion: ITaskView['version']) => {
				const saved = await taskViewsService.setOrder(base.id, taskIds, statedVersion);
				queue.confirmed = saved;
				settle(saved);
				return { view: saved, statedVersion };
			};
			try {
				return await write(order, base.version);
			} catch (error) {
				const conflict = conflictOf(error);
				if (!conflict) throw error;
				const { latest } = await withLatest(conflict, base.id);
				if (!latest) throw conflict;
				queue.confirmed = latest;
				const rebased = orderAfterMove(latest.manualOrder, entry.shownIds, entry.move);
				if (!rebased) {
					// Their order already has the task there.
					settle(latest);
					return null;
				}
				try {
					return await write(rebased, latest.version);
				} catch (retryError) {
					const again = conflictOf(retryError);
					if (!again) {
						settle(latest);
						throw retryError;
					}
					const known = await withLatest(again, base.id);
					if (known.latest) queue.confirmed = known.latest;
					settle(queue.confirmed);
					throw known;
				}
			}
		},
		[adoptNewer, settle]
	);

	/**
	 * Moves a task in the view's manual order (`PUT /task-views/:id/order`), shown at once. The write states the
	 * version of the order it starts from. Refused because someone saved the view meanwhile (409), the move is made
	 * again, once, on the order they saved: a move puts a task next to another one, so it applies to their order as
	 * well. A second refusal is a {@link TaskViewConflictError}, the latest view in the cache; any other failure shows
	 * the order without the move again. `null` when the move changes nothing.
	 */
	const moveTask = useCallback(
		async (
			view: ITaskView,
			move: TaskOrderMove,
			shownIds: readonly string[]
		): Promise<TaskViewMoveResult | null> => {
			const queues = queuesRef.current;
			// An idle view starts from what the page shows: the order the platform holds.
			const queue = queues.get(view.id) ?? { tail: Promise.resolve(), confirmed: view, pending: [] };
			if (!orderAfterMove(pendingOrderOf(queue), shownIds, move)) return null;
			queues.set(view.id, queue);
			const entry: PendingMove = { move, shownIds };
			queue.pending.push(entry);
			showQueue(queue);
			const job = queue.tail.then(() => writeMove(queue, entry));
			queue.tail = job.then(
				() => undefined,
				() => undefined
			);
			try {
				return await job;
			} finally {
				queue.pending = queue.pending.filter((pending) => pending !== entry);
				// The order the platform holds (or a newer view), the move in it or not: a failure shows it without.
				showQueue(queue);
				if (queue.pending.length === 0 && queues.get(view.id) === queue) queues.delete(view.id);
			}
		},
		[showQueue, writeMove]
	);

	const deleteView = useCallback(
		async (view: ITaskView): Promise<void> => {
			await taskViewsService.remove(view.id);
			if (scope) queryClient.removeQueries({ queryKey: queryKeys.taskViews.detail(scope.tenantId, scope.organizationId, scope.userId, view.id) });
			settle();
		},
		[queryClient, scope, settle]
	);

	return { createView, saveDefinition, updateView, moveTask, deleteView };
}
