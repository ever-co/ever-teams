'use client';

import { useAtomValue } from 'jotai';
import { useCallback, useEffect, useState } from 'react';
import { activeTeamState } from '@/core/stores';
import { dailyPlanService } from '../../services/client/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { useDailyPlanCalculations } from './use-daily-plan-calculations';
import { toast } from 'sonner';
import { getErrorMessage, logErrorInDev } from '@/core/lib/helpers/error-message';
import { useSortedTasks } from '../tasks';

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
	const activeTeam = useAtomValue(activeTeamState);
	const allTeamTasks = useSortedTasks();
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
					toast.warning('getEmployeeDailyPlans: No employee ID provided or available in state');
					return null;
				}
			} catch (error) {
				toast.error(`Error when fetching day plans for employee: ${newEmployeeId || internalEmployeeId}`, {
					description: getErrorMessage(error, 'Unable to fetch day plans')
				});
				logErrorInDev(
					`Error when fetching day plans for employee: ${newEmployeeId || internalEmployeeId}`,
					error
				);
				return null; // Return null on error to maintain consistent return type
			}
		},
		[queryClient, activeTeam?.id, internalEmployeeId]
	);

	const loadEmployeeDailyPlans = useCallback(async () => {
		if (internalEmployeeId) {
			await getEmployeeDailyPlans(internalEmployeeId);
			// Data is automatically available via React Query cache
		}
	}, [getEmployeeDailyPlans, internalEmployeeId]);

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

		// Loading states
		isLoading: getDayPlansByEmployeeQuery.isLoading,
		isFetching: getDayPlansByEmployeeQuery.isFetching,
		isError: getDayPlansByEmployeeQuery.isError,
		error: getDayPlansByEmployeeQuery.error,

		// Metadata
		employeeId: internalEmployeeId
	};
}
