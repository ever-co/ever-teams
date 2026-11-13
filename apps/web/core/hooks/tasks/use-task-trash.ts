'use client';

import { useCallback, useMemo } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { TASK_TRASH_PAGE_SIZE, taskTrashService } from '@/core/services/client/api/tasks/task-trash.service';
import { isTaskTrashEnabled } from '@/core/lib/utils/comments-trash-flags';
import { taskDiscussionScope } from '@/core/lib/utils/task-discussion';
import { trashDeleteFailureOf, trashHttpStatusOf, type TaskTrashDeleteOutcome } from '@/core/lib/utils/task-trash';
import type { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import type { ITrashedTask } from '@/core/types/interfaces/task/task-trash';

/**
 * What the trash page shows: the list, or why there is none. `unscoped`: there is nothing to read yet (no team or
 * project named, or no signed-in organization), so the list does not wait for a read that cannot start.
 */
export type TaskTrashStatus = 'off' | 'unscoped' | 'loading' | 'ready' | 'unavailable' | 'forbidden' | 'error';

export interface TaskTrashFilter {
	/** The team whose trash is listed (a manager's read needs it), or with a project the project's team. */
	teamId: string | null;
	/** A project's trash, or `null` for the team's. */
	projectId: string | null;
	search: string;
}

/** The status a failed read stands for: the platform's 404 means its trash is off, 403 that the reader may not see it. */
export function trashStatusOf(error: unknown): TaskTrashStatus {
	const status = trashHttpStatusOf(error);
	if (status === 404) return 'unavailable';
	if (status === 403 || status === 401) return 'forbidden';
	return 'error';
}

/** The offset of the next page, or `undefined` once every trashed task is read (or a page came back empty). */
export function nextTrashOffset(pages: ReadonlyArray<PaginationResponse<ITrashedTask>>): number | undefined {
	const loaded = pages.reduce((count, page) => count + page.items.length, 0);
	const last = pages.at(-1);
	if (!last || last.items.length === 0) return undefined;
	return loaded < last.total ? loaded : undefined;
}

/**
 * The trash of a team or a project (`NEXT_PUBLIC_TASK_TRASH_ENABLED`), most recently deleted first, a page at a time,
 * with restore and delete forever. The list is keyed under `tasks.all`, so a delete anywhere (or a live task hint)
 * refetches it, and a restore refetches the task lists.
 */
export function useTaskTrash(filter: TaskTrashFilter) {
	const queryClient = useQueryClient();
	const scope = taskDiscussionScope();
	const isOn = isTaskTrashEnabled();
	const search = filter.search.trim();
	const queryKey = queryKeys.tasks.trash(
		scope?.tenantId,
		scope?.organizationId,
		filter.teamId,
		filter.projectId,
		search
	);
	const isEnabled = isOn && scope !== null && (filter.teamId !== null || filter.projectId !== null);

	const query = useInfiniteQuery({
		queryKey,
		queryFn: ({ pageParam, signal }) => {
			if (!scope) return Promise.resolve({ items: [], total: 0 });
			return taskTrashService.list(
				{
					organizationTeamId: filter.teamId,
					projectId: filter.projectId,
					search,
					skip: pageParam,
					take: TASK_TRASH_PAGE_SIZE
				},
				scope,
				signal
			);
		},
		initialPageParam: 0,
		getNextPageParam: (_last, pages) => nextTrashOffset(pages),
		enabled: isEnabled,
		// 404 (trash off on the platform) and 403 (not a manager) are answers, not glitches to retry.
		retry: false
	});

	const pages = query.data?.pages;
	const tasks = useMemo(() => {
		const seen = new Set<string>();
		const items: ITrashedTask[] = [];
		for (const page of pages ?? []) {
			for (const task of page.items) {
				if (seen.has(task.id)) continue;
				seen.add(task.id);
				items.push(task);
			}
		}
		return items;
	}, [pages]);
	const total = pages?.at(-1)?.total ?? 0;

	let status: TaskTrashStatus = 'ready';
	if (!isOn) status = 'off';
	else if (!isEnabled) status = 'unscoped';
	else if (query.isError) status = trashStatusOf(query.error);
	else if (query.isPending) status = 'loading';

	// The task lists and the saved and built-in views (My Tasks, Overdue…) sit under different keys: a restored or
	// deleted task leaves or joins both.
	const refreshTaskLists = useCallback(async () => {
		void queryClient.invalidateQueries({ queryKey: queryKeys.taskViews.all });
		await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
	}, [queryClient]);

	/** Brings a task back; `false` when the platform refused it. */
	const restore = useCallback(
		async (task: ITrashedTask): Promise<boolean> => {
			const writeScope = taskDiscussionScope();
			if (!writeScope) return false;
			try {
				await taskTrashService.restore(task.id, writeScope);
			} catch {
				return false;
			}
			await refreshTaskLists();
			return true;
		},
		[refreshTaskLists]
	);

	/**
	 * Deletes a task for good, only while it is still in the trash. `not-in-trash`: someone restored or deleted it since
	 * the list was read, so nothing was deleted, and the lists are read again; `still-linked`: other records still point
	 * at it, so it stays; `failed`: the platform refused it otherwise.
	 */
	const deleteForever = useCallback(
		async (task: ITrashedTask): Promise<TaskTrashDeleteOutcome> => {
			const writeScope = taskDiscussionScope();
			if (!writeScope) return 'failed';
			try {
				await taskTrashService.deleteForever(task.id, writeScope);
			} catch (error) {
				const failure = trashDeleteFailureOf(error);
				if (failure === 'not-in-trash') await refreshTaskLists();
				return failure;
			}
			await refreshTaskLists();
			return 'deleted';
		},
		[refreshTaskLists]
	);

	return {
		status,
		tasks,
		total,
		hasMore: Boolean(query.hasNextPage),
		isLoadingMore: query.isFetchingNextPage,
		loadMore: () => void query.fetchNextPage(),
		retry: () => void query.refetch(),
		restore,
		deleteForever
	};
}
