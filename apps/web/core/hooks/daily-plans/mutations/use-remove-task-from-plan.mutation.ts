import { dailyPlanService } from '@/core/services/client/api';
import { TRemoveTaskFromPlansRequest } from '@/core/types/schemas';
import { useMutation } from '@tanstack/react-query';
import { useInvalidateDailyPlanData } from '../use-invalidate-daily-plan-data';

/**
 * Mutation to remove a task from a single daily plan.
 * Invalidates daily plan cache on success.
 */
export const useRemoveTaskFromPlanMutation = () => {
	const invalidateDailyPlanData = useInvalidateDailyPlanData();

	const removeTaskFromPlanMutation = useMutation({
		mutationFn: async ({ dailyPlanId, data }: { dailyPlanId: string; data: TRemoveTaskFromPlansRequest }) => {
			const res = await dailyPlanService.removeTaskFromPlan(data, dailyPlanId);
			return res;
		},
		onSuccess: (data) => {
			invalidateDailyPlanData();
		}
	});

	return removeTaskFromPlanMutation;
};
