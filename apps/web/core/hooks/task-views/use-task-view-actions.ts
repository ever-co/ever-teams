'use client';

import { useCallback } from 'react';
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

	/**
	 * Moves a task in the view's manual order (`PUT /task-views/:id/order`), shown at once. The write states the
	 * version the page holds. Refused because someone saved the view meanwhile (409), the move is made again, once, on
	 * the order they saved: a move puts a task next to another one, so it applies to their order as well. A second
	 * refusal is a {@link TaskViewConflictError}, the latest view in the cache; any other failure puts back what the
	 * page showed. `null` when the move changes nothing.
	 */
	const moveTask = useCallback(
		async (
			view: ITaskView,
			move: TaskOrderMove,
			shownIds: readonly string[]
		): Promise<TaskViewMoveResult | null> => {
			const order = orderAfterMove(view.manualOrder, shownIds, move);
			if (!order) return null;
			const key = scope
				? queryKeys.taskViews.detail(scope.tenantId, scope.organizationId, scope.userId, view.id)
				: null;
			const shown: ITaskView = { ...view, manualOrder: order };
			if (key) {
				// A read under way would answer the order from before the move.
				await queryClient.cancelQueries({ queryKey: key });
				queryClient.setQueryData(key, shown);
			}
			// Only while the cache still shows this move: a newer view (another move, a refetch) stays.
			const putBack = () => {
				const cached = key ? queryClient.getQueryData<ITaskView>(key) : undefined;
				const showsThisMove =
					cached?.version === shown.version &&
					JSON.stringify(cached?.manualOrder ?? null) === JSON.stringify(order);
				if (key && showsThisMove) queryClient.setQueryData(key, view);
			};
			const write = async (
				taskIds: string[],
				statedVersion: ITaskView['version']
			): Promise<TaskViewMoveResult> => {
				const saved = await taskViewsService.setOrder(view.id, taskIds, statedVersion);
				settle(saved);
				return { view: saved, statedVersion };
			};
			try {
				return await write(order, view.version);
			} catch (error) {
				const conflict = conflictOf(error);
				if (!conflict) {
					putBack();
					throw error;
				}
				const { latest } = await withLatest(conflict, view.id);
				if (!latest) {
					putBack();
					throw conflict;
				}
				const rebased = orderAfterMove(latest.manualOrder, shownIds, move);
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
					const known = await withLatest(again, view.id);
					settle(known.latest ?? latest);
					throw known;
				}
			}
		},
		[queryClient, scope, settle]
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
