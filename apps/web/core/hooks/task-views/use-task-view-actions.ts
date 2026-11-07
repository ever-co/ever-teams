'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { taskViewsService } from '@/core/services/client/api/task-views/task-views.service';
import { columnsOf } from '@/core/lib/utils/task-views';
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

/** The conflict with the latest view in it: read again when the refusal did not carry it. */
async function withLatest(conflict: TaskViewConflictError, viewId: string): Promise<TaskViewConflictError> {
	if (conflict.latest) return conflict;
	const latest = await taskViewsService.getView(viewId).catch(() => null);
	return new TaskViewConflictError(latest);
}

/**
 * Creating, saving, renaming, sharing and deleting the views of the active team. A save states the version the
 * page read; a stale one is a {@link TaskViewConflictError} with the latest view, nothing overwritten.
 */
export function useTaskViewActions() {
	const scope = useTaskViewsScope();
	const queryClient = useQueryClient();

	const settle = useCallback(
		(view?: ITaskView | null) => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.taskViews.all });
			if (view?.id) queryClient.setQueryData(queryKeys.taskViews.detail(view.id), view);
		},
		[queryClient]
	);

	const createView = useCallback(
		async (name: string, visibility: ETaskViewVisibility, definition: ITaskViewDefinition): Promise<ITaskView> => {
			if (!scope) throw new Error('No team');
			const view = await taskViewsService.create({ name, visibility, organizationTeamId: scope.teamId, ...columnsOf(definition) });
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

	const deleteView = useCallback(
		async (view: ITaskView): Promise<void> => {
			await taskViewsService.remove(view.id);
			queryClient.removeQueries({ queryKey: queryKeys.taskViews.detail(view.id) });
			settle();
		},
		[queryClient, settle]
	);

	return { createView, saveDefinition, updateView, deleteView };
}
