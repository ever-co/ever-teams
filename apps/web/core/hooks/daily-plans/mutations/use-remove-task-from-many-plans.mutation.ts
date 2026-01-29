import { dailyPlanService } from '@/core/services/client/api';
import { TRemoveTaskFromPlansRequest } from '@/core/types/schemas';
import { useMutation } from '@tanstack/react-query';
import { useInvalidateDailyPlanData } from '../use-invalidate-daily-plan-data';

/**
 * Mutation to remove a task from multiple daily plans at once.
 * Invalidates daily plan cache on success.
 */
export const useRemoveTaskFromManyPlansMutation = () => {
	const invalidateDailyPlanData = useInvalidateDailyPlanData();

	const removeTaskPlansMutation = useMutation({
		mutationFn: async ({ taskId, data }: { taskId: string; data: TRemoveTaskFromPlansRequest }) => {
			const res = await dailyPlanService.removeManyTaskFromPlans({ taskId, data });
			return res;
		},
		onSuccess: (data) => {
			invalidateDailyPlanData();
		}
	});

	return removeTaskPlansMutation;
};
