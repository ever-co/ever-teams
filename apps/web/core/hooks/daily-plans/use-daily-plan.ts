'use client';

import { queryKeys } from '@/core/query/keys';
import { dailyPlanListState } from '@/core/stores';
import {
	IDailyPlanTasksUpdate,
	IRemoveTaskFromManyPlansRequest
} from '@/core/types/interfaces/task/daily-plan/daily-plan';
import { TCreateDailyPlan, TUpdateDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';
import { useQueryClient } from '@tanstack/react-query';
import { useAtom } from 'jotai';
import { useCallback, useEffect, useState } from 'react';
import { dailyPlanService } from '../../services/client/api';
import { useConditionalUpdateEffect } from '../common';
import { useFirstLoad } from '../common/use-first-load';
import { useCurrentTeam } from '../organizations/teams/use-current-team';
import { useUserQuery } from '../queries/user-user.query';
import {
	useFuturePlans,
	useOutstandingPlans,
	usePastPlans,
	useProfileDailyPlans,
	useSortedPlan,
	useTodayPlan
} from './derived';
import {
	useAddTaskToPlanMutation,
	useCreateDailyPlanMutation,
	useDeleteDailyPlanMutation,
	useRemoveTaskFromManyPlansMutation,
	useRemoveTaskFromPlanMutation,
	useUpdateDailyPlanMutation
} from './mutations';
import {
	useAllDailyPlansQuery,
	useEmployeeDailyPlansQuery,
	useMyDailyPlansQuery,
	usePlansByTaskLazyQuery
} from './queries';

export type FilterTabs = 'Today Tasks' | 'Future Tasks' | 'Past Tasks' | 'All Tasks' | 'Outstanding';

export interface UseDailyPlanOptions {
	/**
	 * Controls whether the queries should be enabled.
	 * Useful for lazy-loading daily plans only when needed (e.g., when accordion is expanded).
	 * @default true
	 */
	enabled?: boolean;
}

/**
 * NOTE: This hook replaces several legacy Jotai atoms
 * (myDailyPlanListState, profileDailyPlanListState, employeePlansListState, taskPlans).
 * Team-wide plans still use dailyPlanListState; per-employee plans and
 * derived views now rely on React Query so Home modal and Profile "Plans"
 * tab stay in sync for the selected employee
 *
 * @param defaultEmployeeId - Optional employee ID to fetch plans for. Defaults to current user's employee ID.
 * @param options - Optional configuration object
 * @param options.enabled - Controls whether queries should be enabled. Defaults to true for backward compatibility.
 */
export function useDailyPlan(defaultEmployeeId: string | null = null, options?: UseDailyPlanOptions) {
	const { data: user } = useUserQuery();
	const activeTeam = useCurrentTeam();
	const targetEmployeeId = defaultEmployeeId || user?.employee?.id;
	const [employeeId, setEmployeeId] = useState(targetEmployeeId || '');
	const queryClient = useQueryClient();

	// Extract options with defaults
	const { enabled = true } = options || {};

	// Keep employeeId in sync with targetEmployeeId unless intentionally overridden elsewhere
	useEffect(() => {
		if (targetEmployeeId && targetEmployeeId !== employeeId) {
			setEmployeeId(targetEmployeeId);
		}
	}, [targetEmployeeId, employeeId]);
	// Queries
	const getDayPlansByEmployeeQuery = useEmployeeDailyPlansQuery(targetEmployeeId, { enabled });

	const getMyDailyPlansQuery = useMyDailyPlansQuery({ enabled });

	const getAllDayPlansQuery = useAllDailyPlansQuery({ enabled });

	const { isLoading: getPlansByTaskQueryLoading, getPlansByTaskId: getPlansByTaskQuery } = usePlansByTaskLazyQuery();

	// Mutations
	const createDailyplanMutation = useCreateDailyPlanMutation();

	const updateDailyPlanMutation = useUpdateDailyPlanMutation();

	const addTaskToPlanMutation = useAddTaskToPlanMutation();

	const removeTaskFromPlanMutation = useRemoveTaskFromPlanMutation();

	const removeTaskPlansMutation = useRemoveTaskFromManyPlansMutation();

	const deleteDailyPlanMutation = useDeleteDailyPlanMutation();

	//  TEAM-WIDE atom - Keep for backward compatibility
	const [dailyPlan, setDailyPlan] = useAtom(dailyPlanListState);
	const { firstLoadData: firstLoadDailyPlanData } = useFirstLoad();

	//  Sync team-wide daily plans (only team-wide atom)
	useConditionalUpdateEffect(
		() => {
			if (getAllDayPlansQuery.data) {
				setDailyPlan(getAllDayPlansQuery.data);
			}
		},
		[getAllDayPlansQuery.data, setDailyPlan],
		Boolean(dailyPlan?.items?.length)
	);

	//  NOTE: Calculate profileDailyPlans from React Query.
	//  Per-employee plans are no longer stored in global atoms; they are derived
	//  from queries to keep views in sync (Home modal, Profile tab, etc.).
	const profileDailyPlans = useProfileDailyPlans(targetEmployeeId, { enabled });

	// All day plans
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

	// My day plans

	const getMyDailyPlans = useCallback(async () => {
		try {
			const res = await getMyDailyPlansQuery.refetch();

			if (res) {
				return res.data;
			} else {
				console.error('Error fetching my daily plans');
			}
		} catch (error) {
			console.error('Error fetching my daily plans:', error);
		}
	}, [getMyDailyPlansQuery]);

	// Loader function for pre-caching in init-state.tsx
	// Does NOT update atoms - data is available via React Query cache
	const loadMyDailyPlans = useCallback(async () => {
		await getMyDailyPlans();
		// Data is automatically available via React Query cache
	}, [getMyDailyPlans]);

	// Employee day plans
	const getEmployeeDayPlans = useCallback(
		async (newEmployeeId: string) => {
			try {
				if (newEmployeeId && typeof newEmployeeId === 'string') {
					// Update the employeeId state to trigger query refetch
					setEmployeeId(newEmployeeId);

					// Wait for the query to refetch with the new employeeId
					const res = await queryClient.fetchQuery({
						queryKey: queryKeys.dailyPlans.byEmployee(newEmployeeId, activeTeam?.id),
						queryFn: async () => {
							const result = await dailyPlanService.getDayPlansByEmployee({ employeeId: newEmployeeId });
							return result;
						}
					});

					return res;
				} else {
					throw new Error('Employee ID should be a string');
				}
			} catch (error) {
				console.error(`Error when fetching day plans for employee: ${newEmployeeId}`, error);
				return null; // Return null on error to maintain consistent return type
			}
		},
		[queryClient, activeTeam?.id, setEmployeeId]
	);

	// Loader function for pre-caching in init-state.tsx
	// Does NOT update atoms - data is available via React Query cache
	const loadEmployeeDayPlans = useCallback(async () => {
		if (targetEmployeeId) {
			await getEmployeeDayPlans(targetEmployeeId);
			// Data is automatically available via React Query cache
		}
	}, [getEmployeeDayPlans, targetEmployeeId]);

	const getPlansByTask = useCallback(
		async (taskId?: string) => {
			try {
				if (taskId) {
					const res = await getPlansByTaskQuery(taskId);
					return res; //  Return data directly instead of setting atom
				} else {
					return;
				}
			} catch (error) {
				console.error('Error fetching plans by task:', error);
			}
		},
		[getPlansByTaskQuery]
	);

	const createDailyPlan = useCallback(
		async (data: TCreateDailyPlan) => {
			if (user?.tenantId) {
				return await createDailyplanMutation.mutateAsync({ ...data, organizationTeamId: activeTeam?.id });
			}
		},
		[createDailyplanMutation, user?.tenantId, activeTeam?.id]
	);

	const updateDailyPlan = useCallback(
		async (data: TUpdateDailyPlan, planId: string) => {
			return await updateDailyPlanMutation.mutateAsync({ data, dailyPlanId: planId });
		},
		[updateDailyPlanMutation]
	);

	const addTaskToPlan = useCallback(
		async (data: IDailyPlanTasksUpdate, planId: string) => {
			return await addTaskToPlanMutation.mutateAsync({ data, dailyPlanId: planId });
		},
		[addTaskToPlanMutation]
	);

	const removeTaskFromPlan = useCallback(
		async (data: IDailyPlanTasksUpdate, planId: string) => {
			return await removeTaskFromPlanMutation.mutateAsync({ data, dailyPlanId: planId });
		},
		[removeTaskFromPlanMutation]
	);

	const removeManyTaskPlans = useCallback(
		async (data: IRemoveTaskFromManyPlansRequest, taskId: string) => {
			return await removeTaskPlansMutation.mutateAsync({ data, taskId });
		},
		[removeTaskPlansMutation]
	);

	const deleteDailyPlan = useCallback(
		async (planId: string) => {
			return await deleteDailyPlanMutation.mutateAsync(planId);
		},
		[deleteDailyPlanMutation]
	);

	const futurePlans = useFuturePlans(targetEmployeeId, { enabled });

	// NOTE: Replacement for pastPlansState atom; exposes strictly past plans
	// for Outstanding and history-related views.
	const pastPlans = usePastPlans(targetEmployeeId, { enabled });

	const todayPlan = useTodayPlan(targetEmployeeId, { enabled });

	// NOTE: Replacement for outstandingPlansState atom; keeps "outstanding"
	// logic close to daily-plan queries instead of global Jotai stores.
	const outstandingPlans = useOutstandingPlans(targetEmployeeId, { enabled });

	// NOTE: Replacement for sortedPlansState atom; generic sorted list
	// used by multiple views (tabs, filters, etc.).
	const sortedPlans = useSortedPlan(targetEmployeeId, { enabled });

	const handleFirstLoad = useCallback(async () => {
		await loadAllDayPlans();
		//  Data is automatically loaded by React Query - no need to manually load
		firstLoadDailyPlanData();
	}, [firstLoadDailyPlanData, loadAllDayPlans]);

	return {
		//  TEAM-WIDE data (kept for backward compatibility)
		dailyPlan,
		setDailyPlan,

		//  LOCAL data (calculated from React Query)
		profileDailyPlans,

		//  BACKWARD COMPATIBILITY - Alias for components still using myDailyPlans
		myDailyPlans: profileDailyPlans,

		//  EMPLOYEE-SPECIFIC data (from React Query, not atoms)
		employeePlans: getDayPlansByEmployeeQuery.data?.items ?? [],

		//  Queries
		getAllDayPlans,
		getAllDayPlansLoading: getAllDayPlansQuery.isLoading,

		getMyDailyPlans,
		getMyDailyPlansLoading: getMyDailyPlansQuery.isLoading,

		getEmployeeDayPlans,
		getDayPlansByEmployeeLoading: getDayPlansByEmployeeQuery.isLoading,

		getPlansByTask,
		getPlansByTaskLoading: getPlansByTaskQueryLoading,

		//  Mutations
		createDailyPlan,
		createDailyPlanLoading: createDailyplanMutation.isPending,

		updateDailyPlan,
		updateDailyPlanLoading: updateDailyPlanMutation.isPending,

		addTaskToPlan,
		addTaskToPlanLoading: addTaskToPlanMutation.isPending,

		removeTaskFromPlan,
		removeTaskFromPlanLoading: removeTaskFromPlanMutation.isPending,

		removeManyTaskPlans,
		removeManyTaskFromPlanLoading: removeTaskPlansMutation.isPending,

		deleteDailyPlan,
		deleteDailyPlanLoading: deleteDailyPlanMutation.isPending,

		//  DERIVED VALUES (calculated locally with useMemo)
		futurePlans,
		pastPlans,
		outstandingPlans,
		todayPlan,
		sortedPlans,

		//  Loaders (for pre-caching in init-state.tsx)
		loadAllDayPlans,
		loadMyDailyPlans,
		loadEmployeeDayPlans,
		firstLoadDailyPlanData: handleFirstLoad
	};
}
