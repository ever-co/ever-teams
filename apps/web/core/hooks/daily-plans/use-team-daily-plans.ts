'use client';

import { useAtom, useAtomValue } from 'jotai';
import { useCallback } from 'react';
import { activeTeamState, dailyPlanListState } from '@/core/stores';
import { useFirstLoad } from '../common/use-first-load';
import { dailyPlanService } from '../../services/client/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { useConditionalUpdateEffect, useQueryCall } from '../common';

export interface UseTeamDailyPlansOptions {
	/**
	 * Controls whether the query should be enabled.
	 * Useful for lazy-loading daily plans only when needed.
	 * @default true
	 */
	enabled?: boolean;
}

/**
 * Hook for fetching and managing daily plans for the ENTIRE TEAM.
 * This hook is optimized for team-wide operations and admin/manager views.
 *
 * Use this hook when:
 * - Displaying all team members' daily plans
 * - Admin/manager dashboard views
 * - Team-wide statistics and summaries
 * - Finding plans by task ID (across all team members)
 *
 * For personal daily plans, use `useMyDailyPlans()` instead.
 * For viewing a specific employee's plans, use `useEmployeeDailyPlans(employeeId)` instead.
 *
 * @param options - Optional configuration
 * @param options.enabled - Controls whether queries should be enabled. Defaults to true.
 *
 * @example
 * ```typescript
 * // Simple usage
 * const { allTeamDailyPlans, teamPlansSummary } = useTeamDailyPlans();
 *
 * // Get plans for a specific task
 * const { getPlansByTask } = useTeamDailyPlans();
 * const taskPlans = await getPlansByTask(taskId);
 * ```
 */
export function useTeamDailyPlans(options?: UseTeamDailyPlansOptions) {
	const activeTeam = useAtomValue(activeTeamState);
	const queryClient = useQueryClient();

	// Extract options with defaults
	const { enabled = true } = options || {};

	// ==================== QUERIES ====================

	const getAllDayPlansQuery = useQuery({
		queryKey: queryKeys.dailyPlans.allPlans(activeTeam?.id),
		queryFn: async () => {
			const res = await dailyPlanService.getAllDayPlans();
			return res;
		},
		enabled: enabled && !!activeTeam?.id,
		gcTime: 1000 * 60 * 60 // 1 hour
	});

	const { loading: getPlansByTaskQueryLoading, queryCall: getPlansByTaskQuery } = useQueryCall((taskId: string) =>
		queryClient.fetchQuery({
			queryKey: queryKeys.dailyPlans.byTask(taskId),
			queryFn: async () => {
				const res = await dailyPlanService.getPlansByTask({ taskId });
				return res;
			},
			gcTime: 1000 * 60 * 60
		})
	);

	// ==================== JOTAI SYNCHRONIZATION (Backward Compatibility) ====================

	// TEAM-WIDE atom - Keep for backward compatibility
	const [dailyPlan, setDailyPlan] = useAtom(dailyPlanListState);
	const { firstLoadData: firstLoadDailyPlanData } = useFirstLoad();

	// Sync team-wide daily plans (only team-wide atom)
	useConditionalUpdateEffect(
		() => {
			if (getAllDayPlansQuery.data) {
				setDailyPlan(getAllDayPlansQuery.data);
			}
		},
		[getAllDayPlansQuery.data, setDailyPlan],
		Boolean(dailyPlan?.items?.length)
	);

	// ==================== QUERY FUNCTIONS ====================

	const getAllDayPlans = useCallback(async () => {
		try {
			const res = await getAllDayPlansQuery.refetch();

			if (res) {
				return res.data;
			} else {
				console.error('Error fetching all day plans');
			}
		} catch (error) {
			console.error('Error fetching all day plans:', error);
		}
	}, [getAllDayPlansQuery]);

	const loadAllDayPlans = useCallback(async () => {
		const allDayPlans = await getAllDayPlansQuery.refetch();

		if (allDayPlans?.data) {
			setDailyPlan(allDayPlans.data);
		}
	}, [getAllDayPlansQuery, setDailyPlan]);

	const getPlansByTask = useCallback(
		async (taskId?: string) => {
			try {
				if (taskId) {
					const res = await getPlansByTaskQuery(taskId);
					return res; // Return data directly instead of setting atom
				} else {
					return;
				}
			} catch (error) {
				console.error('Error fetching plans by task:', error);
			}
		},
		[getPlansByTaskQuery]
	);

	const firstLoadTeamDailyPlans = useCallback(async () => {
		await loadAllDayPlans();
		// Data is automatically loaded by React Query - no need to manually load
		firstLoadDailyPlanData();
	}, [firstLoadDailyPlanData, loadAllDayPlans]);

	// ==================== TEAM SUMMARY ====================

	const teamPlansSummary = {
		totalPlans: getAllDayPlansQuery.data?.total ?? 0,
		totalTasks: getAllDayPlansQuery.data?.items?.reduce((sum, plan) => sum + (plan.tasks?.length ?? 0), 0) ?? 0,
		membersWithPlans: new Set(getAllDayPlansQuery.data?.items?.map((plan) => plan.employeeId).filter(Boolean)).size
	};

	return {
		// Raw data
		allTeamDailyPlans: getAllDayPlansQuery.data || { items: [], total: 0 },

		// Team summary
		teamPlansSummary,

		// Query functions
		getAllDayPlans,
		loadAllDayPlans,
		getPlansByTask,
		firstLoadTeamDailyPlans,

		// Loading states
		isLoading: getAllDayPlansQuery.isLoading,
		isFetching: getAllDayPlansQuery.isFetching,
		getPlansByTaskLoading: getPlansByTaskQueryLoading,
		isError: getAllDayPlansQuery.isError,
		error: getAllDayPlansQuery.error,

		// Backward compatibility (Jotai atom)
		dailyPlan,
		setDailyPlan
	};
}
