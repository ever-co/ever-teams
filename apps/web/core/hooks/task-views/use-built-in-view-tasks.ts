'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { taskViewsService } from '@/core/services/client/api/task-views/task-views.service';
import { isTaskViewsEnabled } from '@/core/lib/utils/task-views-enabled';
import type { ETaskBuiltInView } from '@/core/types/interfaces/common/task-views';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { useTaskViewsScope } from './use-task-views-scope';

const EMPTY: TTask[] = [];

/**
 * The tasks of a built-in view (my tasks, this week, overdue, due soon), computed by the platform in my time zone:
 * every page of them, up to the service's cap, so the view never leaves tasks out silently.
 */
export function useBuiltInViewTasks(key: ETaskBuiltInView | null) {
	const scope = useTaskViewsScope();
	const enabled = isTaskViewsEnabled() && scope !== null && key !== null;
	const query = useQuery({
		// The person is part of the key: "my tasks" of whoever signed in before never show.
		queryKey: queryKeys.taskViews.builtIn(scope?.tenantId, scope?.organizationId, scope?.userId, key),
		queryFn: ({ signal }) => taskViewsService.builtInAll(key as ETaskBuiltInView, signal),
		enabled,
		staleTime: 15_000,
		refetchInterval: 60_000
	});
	return {
		tasks: query.data?.items ?? EMPTY,
		total: query.data?.total ?? 0,
		/** True when the platform holds more tasks than the cap brought. */
		isTruncated: (query.data?.total ?? 0) > (query.data?.items.length ?? 0),
		isLoading: enabled && query.isLoading,
		isError: query.isError,
		refetch: query.refetch
	};
}
