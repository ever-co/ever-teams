import { dailyPlanService } from '@/core/services/client/api';
import { useMutation } from '@tanstack/react-query';
import { useInvalidateDailyPlanData } from '../use-invalidate-daily-plan-data';

/**
 * Mutation to delete a daily plan by ID.
 * Invalidates daily plan cache on success.
 */
export const useDeleteDailyPlanMutation = () => {
	const invalidateDailyPlanData = useInvalidateDailyPlanData();

	const deleteDailyPlanMutation = useMutation({
		mutationFn: async (dailyPlanId: string) => {
			const res = await dailyPlanService.deleteDailyPlan(dailyPlanId);
			return res;
		},
		onSuccess: (data) => {
			invalidateDailyPlanData();
		}
	});

	return deleteDailyPlanMutation;
};
