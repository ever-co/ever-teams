'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { taskViewsService } from '@/core/services/client/api/task-views/task-views.service';
import { sortTaskViews } from '@/core/lib/utils/task-views';
import { isTaskViewsEnabled } from '@/core/lib/utils/task-views-enabled';
import type { ITaskView } from '@/core/types/interfaces/common/task-views';
import { useTaskViewsScope } from './use-task-views-scope';

const EMPTY: ITaskView[] = [];

/** The saved views of the active team the signed-in person may see, in sidebar order. */
export function useTaskViewsQuery() {
	const scope = useTaskViewsScope();
	const enabled = isTaskViewsEnabled() && scope !== null;
	const query = useQuery({
		queryKey: queryKeys.taskViews.list(scope?.tenantId, scope?.organizationId, scope?.teamId),
		queryFn: ({ signal }) => taskViewsService.list(scope!.teamId, signal),
		enabled,
		staleTime: 30_000
	});
	const views = useMemo(() => sortTaskViews(query.data?.items ?? EMPTY), [query.data?.items]);
	return { views, isLoading: enabled && query.isLoading, isError: query.isError, refetch: query.refetch, enabled };
}

/** One saved view by id (a view opened by its URL). */
export function useTaskViewQuery(viewId: string | null | undefined) {
	const scope = useTaskViewsScope();
	const enabled = isTaskViewsEnabled() && scope !== null && !!viewId;
	return useQuery({
		queryKey: queryKeys.taskViews.detail(viewId),
		queryFn: ({ signal }) => taskViewsService.getView(viewId as string, signal),
		enabled,
		staleTime: 10_000,
		retry: false
	});
}
