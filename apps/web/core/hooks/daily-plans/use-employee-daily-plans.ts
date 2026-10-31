'use client';

import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useState } from 'react';
import { activeTeamState, tasksByTeamState } from '@/core/stores';
import { dailyPlanService } from '../../services/client/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { orderTasksInPlans } from '@/core/lib/helpers/daily-plan-task-order';
import { useDailyPlanCalculations } from './use-daily-plan-calculations';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { getErrorMessage, logErrorInDev } from '@/core/lib/helpers/error-message';

export interface UseEmployeeDailyPlansOptions {
	/**
	 * Controls whether the query should be enabled.
	 * Useful for lazy-loading daily plans only when needed.
	 * @default true
	 */
	enabled?: boolean;
}

/**
 * Hook for fetching and managing daily plans for a SPECIFIC EMPLOYEE.
 * This hook is optimized for viewing other team members' plans (not the current user).
 *
 * Use this hook when:
 * - Viewing another employee's daily plans (e.g., in profile page)
 * - Manager viewing team member's plans
 * - Comparing plans between team members
 * - Employee-specific reports and analytics
 *
 * For personal daily plans (current user), use `useMyDailyPlans()` instead.
 * For team-wide operations, use `useTeamDailyPlans()` instead.
 *
 * @param employeeId - The ID of the employee whose plans to fetch. Required.
 * @param options - Optional configuration
 * @param options.enabled - Controls whether queries should be enabled. Defaults to true.
 *
 * @example
 * ```typescript
 * // Simple usage
 * const { employeeTodayPlan, employeeOutstandingPlans } = useEmployeeDailyPlans(employeeId);
 *
 * // With conditional loading (e.g., accordion)
 * const { employeeDailyPlans, isLoading } = useEmployeeDailyPlans(
 *   employeeId,
 *   { enabled: isAccordionExpanded }
 * );
 * ```
 */
export function useEmployeeDailyPlans(employeeId: string | null, options?: UseEmployeeDailyPlansOptions) {
	const t = useTranslations();
	const activeTeam = useAtomValue(activeTeamState);
	const allTeamTasks = useAtomValue(tasksByTeamState);
	const queryClient = useQueryClient();
	const [internalEmployeeId, setInternalEmployeeId] = useState(employeeId || '');

	// Extract options with defaults
	const { enabled = true } = options || {};

	// Keep employeeId in sync with prop unless intentionally overridden elsewhere
	useEffect(() => {
		if (employeeId && employeeId !== internalEmployeeId) {
			setInternalEmployeeId(employeeId);
		}
	}, [employeeId, internalEmployeeId]);

	// ==================== QUERY ====================

	// ==================== QUERY ====================

	const getDayPlansByEmployeeQuery = useQuery({
		queryKey: queryKeys.dailyPlans.byEmployee(internalEmployeeId, activeTeam?.id),
		queryFn: async () => {
			if (!internalEmployeeId) {
				throw new Error('Employee ID is required to fetch daily plans');
			}
			const res = await dailyPlanService.getDayPlansByEmployee({ employeeId: internalEmployeeId });
			return res;
		},
		select: orderTasksInPlans,
		enabled: enabled && !!internalEmployeeId,
		gcTime: 1000 * 60 * 60 // 1 hour
	});

	// ==================== DERIVED STATE ====================

	const calculations = useDailyPlanCalculations(
		getDayPlansByEmployeeQuery.data,
		allTeamTasks,
		internalEmployeeId,
		activeTeam
	);

	// ==================== QUERY FUNCTIONS ====================

	const getEmployeeDailyPlans = useCallback(
		async (newEmployeeId?: string) => {
			try {
				// Use internalEmployeeId as fallback to ensure we're refreshing the CURRENTLY viewed employee
				// unless a new ID is explicitly provided
				const targetEmployeeId = newEmployeeId || internalEmployeeId;

				if (targetEmployeeId) {
					// Update the employeeId state to trigger query refetch
					if (newEmployeeId && newEmployeeId !== internalEmployeeId) {
						setInternalEmployeeId(newEmployeeId);
					}

					// Wait for the query to refetch with the new employeeId
					// Note: If newEmployeeId is NOT provided, we just want to refresh data for current internalEmployeeId
					const res = await queryClient.fetchQuery({
						queryKey: queryKeys.dailyPlans.byEmployee(targetEmployeeId, activeTeam?.id),
						queryFn: async () => {
							const result = await dailyPlanService.getDayPlansByEmployee({
								employeeId: targetEmployeeId
							});
							return result;
						}
					});

					return res;
				} else {
					toast.warning(t('dailyPlan.toastMessages.MISSING_EMPLOYEE_ID'));
					return null;
				}
			} catch (error) {
				const failedEmployeeId = newEmployeeId || internalEmployeeId;
				const fetchFailedMessage = t('dailyPlan.toastMessages.EMPLOYEE_PLANS_FETCH_FAILED', {
					employeeId: failedEmployeeId
				});
				const fetchFailedFallback = t('dailyPlan.toastMessages.PLANS_FETCH_FAILED');
				toast.error(fetchFailedMessage, {
					description: getErrorMessage(error, fetchFailedFallback)
				});
				logErrorInDev(
					`Error when fetching day plans for employee: ${newEmployeeId || internalEmployeeId}`,
					error
				);
				return null; // Return null on error to maintain consistent return type
			}
		},
		[queryClient, activeTeam?.id, internalEmployeeId, t]
	);

	const loadEmployeeDailyPlans = useCallback(async () => {
		if (internalEmployeeId) {
			await getEmployeeDailyPlans(internalEmployeeId);
			// Data is automatically available via React Query cache
		}
	}, [getEmployeeDailyPlans, internalEmployeeId]);

	const activeTeamId = activeTeam?.id;
	// For a consumer that shows these plans on demand: a cache under a minute old answers without a request
	const ensureEmployeeDailyPlans = useCallback(async () => {
		if (!enabled || !internalEmployeeId) {
			return;
		}
		try {
			await queryClient.fetchQuery({
				queryKey: queryKeys.dailyPlans.byEmployee(internalEmployeeId, activeTeamId),
				queryFn: () => dailyPlanService.getDayPlansByEmployee({ employeeId: internalEmployeeId }),
				staleTime: 60_000,
				// Callers keep the cached plans, a retry would only delay them
				retry: false
			});
		} catch {
			// The cached plans stay on screen
		}
	}, [activeTeamId, enabled, internalEmployeeId, queryClient]);

	return {
		// Raw data
		employeeDailyPlans: getDayPlansByEmployeeQuery.data || { items: [], total: 0 },

		// Derived state (with "employee" prefix for clarity)
		employeeTodayPlan: calculations.todayPlan,
		employeeFuturePlans: calculations.futurePlans,
		employeePastPlans: calculations.pastPlans,
		employeeOutstandingPlans: calculations.outstandingPlans,
		employeeTodayTasks: calculations.todayTasks,
		employeeFutureTasks: calculations.futureTasks,
		employeeSortedPlans: calculations.sortedPlans,

		// Query functions
		getEmployeeDailyPlans,
		loadEmployeeDailyPlans,
		ensureEmployeeDailyPlans,

		// Loading states
		isLoading: getDayPlansByEmployeeQuery.isLoading,
		isFetching: getDayPlansByEmployeeQuery.isFetching,
		isError: getDayPlansByEmployeeQuery.isError,
		error: getDayPlansByEmployeeQuery.error,

		// Metadata
		employeeId: internalEmployeeId
	};
}
