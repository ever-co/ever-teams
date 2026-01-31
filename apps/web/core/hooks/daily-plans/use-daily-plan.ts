'use client';

import { useDailyPlanQuery } from './use-daily-plan-query';
import { useCreateDailyPlan } from './use-create-daily-plan';
import { useUpdateDailyPlan } from './use-update-daily-plan';
import { useDeleteDailyPlan } from './use-delete-daily-plan';

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
 * @deprecated This monolithic hook has been split into specialized hooks for better performance.
 *
 * **Migration Guide**:
 *
 * For READ operations (queries and derived state), use `useDailyPlanQuery`:
 * ```typescript
 * import { useDailyPlanQuery } from '@/core/hooks/daily-plans/use-daily-plan-query';
 * const { todayTasks, futurePlans, outstandingPlans } = useDailyPlanQuery();
 * ```
 *
 * For CREATE operations, use `useCreateDailyPlan`:
 * ```typescript
 * import { useCreateDailyPlan } from '@/core/hooks/daily-plans/use-create-daily-plan';
 * const { createDailyPlan, createDailyPlanLoading } = useCreateDailyPlan();
 * ```
 *
 * For UPDATE operations, use `useUpdateDailyPlan`:
 * ```typescript
 * import { useUpdateDailyPlan } from '@/core/hooks/daily-plans/use-update-daily-plan';
 * const { updateDailyPlan, addTaskToPlan, removeTaskFromPlan } = useUpdateDailyPlan();
 * ```
 *
 * For DELETE operations, use `useDeleteDailyPlan`:
 * ```typescript
 * import { useDeleteDailyPlan } from '@/core/hooks/daily-plans/use-delete-daily-plan';
 * const { deleteDailyPlan, deleteDailyPlanLoading } = useDeleteDailyPlan();
 * ```
 *
 * **Benefits of Migration**:
 * - 90-95% reduction in unnecessary code execution
 * - Better performance (only load what you need)
 * - Smaller bundle size (better tree-shaking)
 * - Clearer code intent
 * - Easier to test and maintain
 *
 * **Backward Compatibility**:
 * This hook still works but re-exports all functionality from the new specialized hooks.
 * It will be removed in a future version once all components are migrated.
 *
 * @param defaultEmployeeId - Optional employee ID to fetch plans for. Defaults to current user's employee ID.
 * @param options - Optional configuration object
 * @param options.enabled - Controls whether queries should be enabled. Defaults to true for backward compatibility.
 */
export function useDailyPlan(defaultEmployeeId: string | null = null, options?: UseDailyPlanOptions) {
	// Re-export all functionality from specialized hooks for backward compatibility
	const queryHook = useDailyPlanQuery(defaultEmployeeId, options);
	const createHook = useCreateDailyPlan();
	const updateHook = useUpdateDailyPlan();
	const deleteHook = useDeleteDailyPlan();

	return {
		// Query operations (from useDailyPlanQuery)
		...queryHook,

		// Create operations (from useCreateDailyPlan)
		createDailyPlan: createHook.createDailyPlan,
		createDailyPlanLoading: createHook.createDailyPlanLoading,

		// Update operations (from useUpdateDailyPlan)
		updateDailyPlan: updateHook.updateDailyPlan,
		updateDailyPlanLoading: updateHook.updateDailyPlanLoading,
		addTaskToPlan: updateHook.addTaskToPlan,
		addTaskToPlanLoading: updateHook.addTaskToPlanLoading,
		removeTaskFromPlan: updateHook.removeTaskFromPlan,
		removeTaskFromPlanLoading: updateHook.removeTaskFromPlanLoading,
		removeManyTaskPlans: updateHook.removeManyTaskPlans,
		removeManyTaskFromPlanLoading: updateHook.removeManyTaskFromPlanLoading,

		// Delete operations (from useDeleteDailyPlan)
		deleteDailyPlan: deleteHook.deleteDailyPlan,
		deleteDailyPlanLoading: deleteHook.deleteDailyPlanLoading

		// Note: todayTasks is already in queryHook, no need to add separately
	};
}
