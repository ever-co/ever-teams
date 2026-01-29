'use client';

import { queryKeys } from '@/core/query/keys';
import { dailyPlanService } from '@/core/services/client/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useAuthenticateUser } from '../../auth';
import { useCurrentTeam } from '../../organizations/teams/use-current-team';
import { IUseDailyPlanOptions } from './use-daily-plan-options';
import { DAILY_PLAN_QUERY_GC_TIME } from './constants';

/**
 * Fetches daily plans for a specific employee.
 * Falls back to current user if no employeeId provided.
 *
 * @param employeeId - Target employee ID (optional, defaults to current user)
 * @param options - Query options ({ enabled })
 */
export const useEmployeeDailyPlansQuery = (employeeId?: string, options: IUseDailyPlanOptions = {}) => {
	const { enabled = true } = options;
	const { user } = useAuthenticateUser();

	const _employeeId = useMemo(
		() => employeeId ?? user?.employeeId ?? user?.employee?.id,
		[employeeId, user?.employeeId, user?.employee?.id]
	);

	// Get current team context
	const activeTeam = useCurrentTeam();
	const teamId = activeTeam?.id ?? null;

	return useQuery({
		queryKey: queryKeys.dailyPlans.byEmployee(_employeeId ?? null, teamId),
		queryFn: async () => {
			// Safety check - should not reach here if enabled logic is correct
			if (!_employeeId) {
				throw new Error('Employee ID is required to fetch daily plans');
			}

			// Fetch daily plans for the specific employee
			const response = await dailyPlanService.getDayPlansByEmployee({ employeeId: _employeeId });

			return response;
		},

		// Only enable when we have both _employeeId and teamId
		enabled: enabled && !!_employeeId && !!teamId,

		// Default stale time
		staleTime: DAILY_PLAN_QUERY_GC_TIME // 1 hour
	});
};

/**
 * Lazy version of useEmployeeDailyPlansQuery.
 * Fetches on-demand via `getPlanByEmployeeId()` instead of automatically.
 */
export const useEmployeeDailyPlansQueryLazy = () => {
	// Get current team context
	const activeTeam = useCurrentTeam();
	const teamId = activeTeam?.id ?? null;

	// utility for lazy query
	const queryClient = useQueryClient();
	const [queryKey, setQueryKey] = useState<ReturnType<typeof queryKeys.dailyPlans.byEmployee> | null>(null);
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

	const getPlanByEmployeeId = (employeeId: string) => {
		return queryClient.fetchQuery({
			queryKey: queryKeys.dailyPlans.byEmployee(employeeId ?? null, teamId),
			queryFn: async ({ queryKey }) => {
				setQueryKey(queryKey);
				if (!employeeId) throw new Error('Required parameters missing');
				return await dailyPlanService.getDayPlansByEmployee({ employeeId });
			},
			gcTime: DAILY_PLAN_QUERY_GC_TIME
		});
	};

	return { getPlanByEmployeeId, ...state, ...status };
};
