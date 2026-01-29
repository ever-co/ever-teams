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
 * @deprecated This monolithic hook is deprecated and will be removed in a future release.
 * Use the specialized hooks directly for better performance and maintainability.
 *
 * ## 🚀 Migration Guide
 *
 * ### Queries - Use these hooks directly:
 * | Old (useDailyPlan)                  | New (Direct Hook)                              |
 * |-------------------------------------|------------------------------------------------|
 * | `getAllDayPlans()`                  | `useAllDailyPlansQuery()`                      |
 * | `getAllDayPlansLoading`             | `useAllDailyPlansQuery().isLoading`            |
 * | `getMyDailyPlans()`                 | `useMyDailyPlansQuery()`                       |
 * | `getMyDailyPlansLoading`            | `useMyDailyPlansQuery().isLoading`             |
 * | `getEmployeeDayPlans(employeeId)`   | `useEmployeeDailyPlansQuery(employeeId)`       |
 * | `getDayPlansByEmployeeLoading`      | `useEmployeeDailyPlansQuery().isLoading`       |
 * | `getPlansByTask(taskId)`            | `usePlansByTaskLazyQuery()`                    |
 * | `getPlansByTaskLoading`             | `usePlansByTaskLazyQuery().isLoading`          |
 *
 * ### Mutations - Use these hooks directly:
 * | Old (useDailyPlan)                  | New (Direct Hook)                              |
 * |-------------------------------------|------------------------------------------------|
 * | `createDailyPlan(data)`             | `useCreateDailyPlanMutation().mutateAsync()`   |
 * | `createDailyPlanLoading`            | `useCreateDailyPlanMutation().isPending`       |
 * | `updateDailyPlan(data, id)`         | `useUpdateDailyPlanMutation().mutateAsync()`   |
 * | `updateDailyPlanLoading`            | `useUpdateDailyPlanMutation().isPending`       |
 * | `addTaskToPlan(data, id)`           | `useAddTaskToPlanMutation().mutateAsync()`     |
 * | `addTaskToPlanLoading`              | `useAddTaskToPlanMutation().isPending`         |
 * | `removeTaskFromPlan(data, id)`      | `useRemoveTaskFromPlanMutation().mutateAsync()`|
 * | `removeTaskFromPlanLoading`         | `useRemoveTaskFromPlanMutation().isPending`    |
 * | `removeManyTaskPlans(data, taskId)` | `useRemoveTaskFromManyPlansMutation().mutateAsync()` |
 * | `removeManyTaskFromPlanLoading`     | `useRemoveTaskFromManyPlansMutation().isPending`|
 * | `deleteDailyPlan(id)`               | `useDeleteDailyPlanMutation().mutateAsync()`   |
 * | `deleteDailyPlanLoading`            | `useDeleteDailyPlanMutation().isPending`       |
 *
 * ### Derived Data - Use these hooks directly:
 * | Old (useDailyPlan)                  | New (Direct Hook)                              |
 * |-------------------------------------|------------------------------------------------|
 * | `profileDailyPlans`                 | `useProfileDailyPlans(employeeId)`             |
 * | `myDailyPlans`                      | `useProfileDailyPlans()` (current user)        |
 * | `todayPlan`                         | `useTodayPlan(employeeId)`                     |
 * | `futurePlans`                       | `useFuturePlans(employeeId)`                   |
 * | `pastPlans`                         | `usePastPlans(employeeId)`                     |
 * | `outstandingPlans`                  | `useOutstandingPlans(employeeId)`              |
 * | `sortedPlans`                       | `useSortedPlan(employeeId)`                    |
 *
 * ### Legacy Jotai State (for backward compatibility only):
 * | Old (useDailyPlan)                  | New (Direct Usage)                             |
 * |-------------------------------------|------------------------------------------------|
 * | `dailyPlan`                         | `useAtom(dailyPlanListState)`                  |
 * | `setDailyPlan`                      | `useAtom(dailyPlanListState)[1]`               |
 *
 * ## 📦 Example Migration
 *
 * ### Before (deprecated):
 * ```tsx
 * const {
 *   todayPlan,
 *   createDailyPlan,
 *   createDailyPlanLoading,
 *   getMyDailyPlans
 * } = useDailyPlan();
 *
 * const handleCreate = async () => {
 *   await createDailyPlan({ date: new Date() });
 *   await getMyDailyPlans();
 * };
 * ```
 *
 * ### After (recommended):
 * ```tsx
 * const todayPlan = useTodayPlan();
 * const { mutateAsync: createDailyPlan, isPending } = useCreateDailyPlanMutation();
 * const { data: myPlans } = useMyDailyPlansQuery();
 *
 * const handleCreate = async () => {
 *   await createDailyPlan({ date: new Date() });
 *   // No need to manually refetch - cache is invalidated automatically
 * };
 * ```
 *
 * @param defaultEmployeeId - Employee ID to fetch plans for (defaults to current user)
 * @param options - Configuration options ({ enabled })
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

	/**
	 * @deprecated Use `useAllDailyPlansQuery().refetch()` instead.
	 * This wrapper adds no additional logic.
	 */
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

	/**
	 * @deprecated Use `useAllDailyPlansQuery()` with Jotai sync if needed.
	 * This wrapper adds no additional logic beyond syncing to legacy atom.
	 */
	const loadAllDayPlans = useCallback(async () => {
		const allDayPlans = await getAllDayPlansQuery.refetch();

		if (allDayPlans?.data) {
			setDailyPlan(allDayPlans.data);
		}
	}, [getAllDayPlansQuery, setDailyPlan]);

	/**
	 * @deprecated Use `useMyDailyPlansQuery().refetch()` instead.
	 * This wrapper adds no additional logic.
	 */
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

	/**
	 * @deprecated Use `useMyDailyPlansQuery()` directly.
	 * Data is automatically cached by React Query.
	 */
	const loadMyDailyPlans = useCallback(async () => {
		await getMyDailyPlans();
		// Data is automatically available via React Query cache
	}, [getMyDailyPlans]);

	/**
	 * @deprecated Use `useEmployeeDailyPlansQuery(employeeId)` instead.
	 * This wrapper adds no additional logic.
	 */
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

	/**
	 * @deprecated Use `useEmployeeDailyPlansQuery(employeeId)` directly.
	 * Data is automatically cached by React Query.
	 */
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

	/**
	 * @deprecated Use `useCreateDailyPlanMutation().mutateAsync(data)` instead.
	 * This wrapper only adds `organizationTeamId` - include it in your data directly.
	 */
	const createDailyPlan = useCallback(
		async (data: TCreateDailyPlan) => {
			if (user?.tenantId) {
				return await createDailyplanMutation.mutateAsync({ ...data, organizationTeamId: activeTeam?.id });
			}
		},
		[createDailyplanMutation, user?.tenantId, activeTeam?.id]
	);

	/**
	 * @deprecated Use `useUpdateDailyPlanMutation().mutateAsync({ data, dailyPlanId })` instead.
	 * This wrapper adds no additional logic.
	 */
	const updateDailyPlan = useCallback(
		async (data: TUpdateDailyPlan, planId: string) => {
			return await updateDailyPlanMutation.mutateAsync({ data, dailyPlanId: planId });
		},
		[updateDailyPlanMutation]
	);

	/**
	 * @deprecated Use `useAddTaskToPlanMutation().mutateAsync({ data, dailyPlanId })` instead.
	 * This wrapper adds no additional logic.
	 */
	const addTaskToPlan = useCallback(
		async (data: IDailyPlanTasksUpdate, planId: string) => {
			return await addTaskToPlanMutation.mutateAsync({ data, dailyPlanId: planId });
		},
		[addTaskToPlanMutation]
	);

	/**
	 * @deprecated Use `useRemoveTaskFromPlanMutation().mutateAsync({ data, dailyPlanId })` instead.
	 * This wrapper adds no additional logic.
	 */
	const removeTaskFromPlan = useCallback(
		async (data: IDailyPlanTasksUpdate, planId: string) => {
			return await removeTaskFromPlanMutation.mutateAsync({ data, dailyPlanId: planId });
		},
		[removeTaskFromPlanMutation]
	);

	/**
	 * @deprecated Use `useRemoveTaskFromManyPlansMutation().mutateAsync({ data, taskId })` instead.
	 * This wrapper adds no additional logic.
	 */
	const removeManyTaskPlans = useCallback(
		async (data: IRemoveTaskFromManyPlansRequest, taskId: string) => {
			return await removeTaskPlansMutation.mutateAsync({ data, taskId });
		},
		[removeTaskPlansMutation]
	);

	/**
	 * @deprecated Use `useDeleteDailyPlanMutation().mutateAsync(planId)` instead.
	 * This wrapper adds no additional logic.
	 */
	const deleteDailyPlan = useCallback(
		async (planId: string) => {
			return await deleteDailyPlanMutation.mutateAsync(planId);
		},
		[deleteDailyPlanMutation]
	);

	/**
	 * Plans scheduled for future dates.
	 * @deprecated Use `useFuturePlans(employeeId)` directly.
	 */
	const futurePlans = useFuturePlans(targetEmployeeId, { enabled });

	/**
	 * NOTE: Replacement for pastPlansState atom; exposes strictly past plans
	 * for Outstanding and history-related views.
	 * Plans from past dates.
	 * @deprecated Use `usePastPlans(employeeId)` directly.
	 */
	const pastPlans = usePastPlans(targetEmployeeId, { enabled });

	/**
	 * Today's plan for the employee.
	 * @deprecated Use `useTodayPlan(employeeId)` directly.
	 */
	const todayPlan = useTodayPlan(targetEmployeeId, { enabled });

	/**
	 * NOTE: Replacement for outstandingPlansState atom; keeps "outstanding"
	 *logic close to daily-plan queries instead of global Jotai stores.
	 * Plans with incomplete tasks past their due date.
	 * @deprecated Use `useOutstandingPlans(employeeId)` directly.
	 */
	const outstandingPlans = useOutstandingPlans(targetEmployeeId, { enabled });

	/**
	 * NOTE: Replacement for sortedPlansState atom; generic sorted list
	 * used by multiple views (tabs, filters, etc.).
	 * Plans sorted by date.
	 * @deprecated Use `useSortedPlan(employeeId)` directly.
	 */
	const sortedPlans = useSortedPlan(targetEmployeeId, { enabled });

	/**
	 * @deprecated Queries are now automatically managed by React Query.
	 * Use individual query hooks with `enabled` option for conditional fetching.
	 */
	const handleFirstLoad = useCallback(async () => {
		await loadAllDayPlans();
		//  Data is automatically loaded by React Query - no need to manually load
		firstLoadDailyPlanData();
	}, [firstLoadDailyPlanData, loadAllDayPlans]);

	return {
		/**
		 * Legacy Jotai State (backward compatibility)
		 *  @deprecated Use `useAtom(dailyPlanListState)` directly
		 */
		dailyPlan,
		/**
		 * @deprecated Use `useAtom(dailyPlanListState)[1]` directly.
		 */
		setDailyPlan,

		/**
		 * Current employee's daily plans.
		 * @deprecated Use `useProfileDailyPlans(employeeId)` directly.
		 */
		profileDailyPlans,

		/**
		 * Alias for profileDailyPlans.
		 * @deprecated Use `useProfileDailyPlans()` directly.
		 */
		myDailyPlans: profileDailyPlans,

		/**
		 * Raw employee plans from query.
		 * @deprecated Use `useEmployeeDailyPlansQuery(employeeId).data?.items` directly.
		 */
		employeePlans: getDayPlansByEmployeeQuery.data?.items ?? [],

		//  Queries
		/**
		 * Fetches all team daily plans.
		 * @deprecated Use `useAllDailyPlansQuery().refetch()` directly.
		 */
		getAllDayPlans,
		/**
		 * @deprecated Use `useAllDailyPlansQuery().isLoading` directly.
		 */
		getAllDayPlansLoading: getAllDayPlansQuery.isLoading,

		/**
		 * Fetches current user's daily plans.
		 * @deprecated Use `useMyDailyPlansQuery().refetch()` directly.
		 */
		getMyDailyPlans,
		/**
		 * @deprecated Use `useMyDailyPlansQuery().isLoading` directly.
		 */
		getMyDailyPlansLoading: getMyDailyPlansQuery.isLoading,

		/**
		 * Fetches daily plans for a specific employee.
		 * @deprecated Use `useEmployeeDailyPlansQuery(employeeId)` directly.
		 */
		getEmployeeDayPlans,
		/**
		 * @deprecated Use `useEmployeeDailyPlansQuery().isLoading` directly.
		 */
		getDayPlansByEmployeeLoading: getDayPlansByEmployeeQuery.isLoading,

		/**
		 * Fetches plans containing a specific task.
		 * @deprecated Use `usePlansByTaskLazyQuery().getPlansByTaskId(taskId)` directly.
		 */
		getPlansByTask,
		/**
		 * @deprecated Use `usePlansByTaskLazyQuery().isLoading` directly.
		 */
		getPlansByTaskLoading: getPlansByTaskQueryLoading,

		//  Mutations
		/**
		 * Creates a new daily plan.
		 * @deprecated Use `useCreateDailyPlanMutation().mutateAsync(data)` directly.
		 */
		createDailyPlan,
		/**
		 * @deprecated Use `useCreateDailyPlanMutation().isPending` directly.
		 */
		createDailyPlanLoading: createDailyplanMutation.isPending,

		/**
		 * Updates an existing daily plan.
		 * @deprecated Use `useUpdateDailyPlanMutation().mutateAsync({ data, dailyPlanId })` directly.
		 */
		updateDailyPlan,
		/**
		 * @deprecated Use `useUpdateDailyPlanMutation().isPending` directly.
		 */
		updateDailyPlanLoading: updateDailyPlanMutation.isPending,

		/**
		 * Adds a task to a daily plan.
		 * @deprecated Use `useAddTaskToPlanMutation().mutateAsync({ data, dailyPlanId })` directly.
		 */
		addTaskToPlan,
		/**
		 * @deprecated Use `useAddTaskToPlanMutation().isPending` directly.
		 */
		addTaskToPlanLoading: addTaskToPlanMutation.isPending,

		/**
		 * Removes a task from a daily plan.
		 * @deprecated Use `useRemoveTaskFromPlanMutation().mutateAsync({ data, dailyPlanId })` directly.
		 */
		removeTaskFromPlan,
		/**
		 * @deprecated Use `useRemoveTaskFromPlanMutation().isPending` directly.
		 */
		removeTaskFromPlanLoading: removeTaskFromPlanMutation.isPending,

		/**
		 * Removes a task from multiple daily plans.
		 * @deprecated Use `useRemoveTaskFromManyPlansMutation().mutateAsync({ data, taskId })` directly.
		 */
		removeManyTaskPlans,
		/**
		 * @deprecated Use `useRemoveTaskFromManyPlansMutation().isPending` directly.
		 */
		removeManyTaskFromPlanLoading: removeTaskPlansMutation.isPending,

		/**
		 * Deletes a daily plan.
		 * @deprecated Use `useDeleteDailyPlanMutation().mutateAsync(planId)` directly.
		 */
		deleteDailyPlan,
		/**
		 * @deprecated Use `useDeleteDailyPlanMutation().isPending` directly.
		 */
		deleteDailyPlanLoading: deleteDailyPlanMutation.isPending,

		//  DERIVED VALUES (calculated locally with useMemo)
		/**
		 * Plans scheduled for future dates.
		 * @deprecated Use `useFuturePlans(employeeId)` directly.
		 */
		futurePlans,
		/**
		 * Plans from past dates.
		 * @deprecated Use `usePastPlans(employeeId)` directly.
		 */
		pastPlans,
		/**
		 * Plans with incomplete tasks past their due date.
		 * @deprecated Use `useOutstandingPlans(employeeId)` directly.
		 */
		outstandingPlans,
		/**
		 * Today's plan for the employee.
		 * @deprecated Use `useTodayPlan(employeeId)` directly.
		 */
		todayPlan,
		/**
		 * Plans sorted by date.
		 * @deprecated Use `useSortedPlan(employeeId)` directly.
		 */
		sortedPlans,

		//  Loaders (for pre-caching in init-state.tsx)

		/**
		 * Pre-loads all team plans into cache.
		 * @deprecated Queries are auto-managed by React Query. Use `useAllDailyPlansQuery()` with `enabled` option.
		 */
		loadAllDayPlans,
		/**
		 * Pre-loads current user's plans into cache.
		 * @deprecated Queries are auto-managed by React Query. Use `useMyDailyPlansQuery()` with `enabled` option.
		 */
		loadMyDailyPlans,
		/**
		 * Pre-loads specific employee's plans into cache.
		 * @deprecated Queries are auto-managed by React Query. Use `useEmployeeDailyPlansQuery(employeeId)` with `enabled` option.
		 */
		loadEmployeeDayPlans,
		/**
		 * Initializes daily plan data on first app load.
		 * @deprecated Queries are auto-managed by React Query. Remove manual initialization.
		 */
		firstLoadDailyPlanData: handleFirstLoad
	};
}
