'use client';

import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import { dailyPlanService } from '@/core/services/client/api';
import { useDailyPlanInvalidation } from './use-daily-plan-invalidation';

/**
 * Hook for deleting daily plans.
 * Handles DELETE operations only, following Single Responsibility Principle.
 *
 * @returns Object containing delete mutation and loading state
 */
export function useDeleteDailyPlan() {
	const { invalidateDailyPlanData } = useDailyPlanInvalidation();

	const deleteDailyPlanMutation = useMutation({
		mutationFn: async (dailyPlanId: string) => {
			const res = await dailyPlanService.deleteDailyPlan(dailyPlanId);
			return res;
		},
		onSuccess: () => {
			invalidateDailyPlanData();
		}
	});

	// Depend on the STABLE mutateAsync, never on the mutation result object (recreated on every state change).
	const deleteDailyPlanMutateAsync = deleteDailyPlanMutation.mutateAsync;
	const deleteDailyPlan = useCallback(
		async (planId: string) => {
			return await deleteDailyPlanMutateAsync(planId);
		},
		[deleteDailyPlanMutateAsync]
	);

	return {
		deleteDailyPlan,
		deleteDailyPlanLoading: deleteDailyPlanMutation.isPending,
		invalidateDailyPlanData
	};
}
