'use client';

import { queryKeys } from '@/core/query/keys';
import { dailyPlanService } from '@/core/services/client/api';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { DAILY_PLAN_QUERY_GC_TIME } from './constants';

/**
 * Lazy query to fetch daily plans containing a specific task.
 * Fetches on-demand via `getPlansByTaskId()`.
 */
export const usePlansByTaskLazyQuery = () => {
	// utility for lazy query
	const queryClient = useQueryClient();
	const [queryKey, setQueryKey] = useState<ReturnType<typeof queryKeys.dailyPlans.byTask> | null>(null);
	const state = queryClient.getQueryState(queryKey ?? ['_none']);
	const status = useMemo(
		() => ({
			isError: state?.status == 'error',
			isPending: state?.status == 'pending',
			isSuccess: state?.status == 'success',
			isLoading: state?.status == 'pending' && state?.fetchStatus == 'fetching'
		}),
		[state?.status, state?.fetchStatus]
	);

	const getPlansByTaskId = useCallback(
		(taskId: string) => {
			return queryClient.fetchQuery({
				queryKey: queryKeys.dailyPlans.byTask(taskId),
				queryFn: async ({ queryKey }) => {
					setQueryKey(queryKey);
					if (!taskId) throw new Error('Required parameters missing');
					const res = await dailyPlanService.getPlansByTask({ taskId });
					return res;
				},
				gcTime: DAILY_PLAN_QUERY_GC_TIME
			});
		},
		[queryClient]
	);

	return { getPlansByTaskId, ...state, ...status };
};
