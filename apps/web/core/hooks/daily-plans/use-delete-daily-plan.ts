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

	const deleteDailyPlan = useCallback(
		async (planId: string) => {
			return await deleteDailyPlanMutation.mutateAsync(planId);
		},
		[deleteDailyPlanMutation]
	);

	return {
		deleteDailyPlan,
		deleteDailyPlanLoading: deleteDailyPlanMutation.isPending,
		invalidateDailyPlanData
	};
}
