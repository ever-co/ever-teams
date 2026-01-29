import { dailyPlanService } from '@/core/services/client/api';
import { TCreateDailyPlan } from '@/core/types/schemas';
import { useMutation } from '@tanstack/react-query';
import { useInvalidateDailyPlanData } from '../use-invalidate-daily-plan-data';
import { toast } from 'sonner';
import { getErrorMessage, logErrorInDev } from '@/core/lib/helpers/error-message';

/**
 * Mutation to create a new daily plan.
 * Shows error toast on failure. Invalidates daily plan cache on success.
 */
export const useCreateDailyPlanMutation = () => {
	const invalidateDailyPlanData = useInvalidateDailyPlanData();

	const createDailyplanMutation = useMutation({
		mutationFn: async (data: TCreateDailyPlan) => {
			const res = await dailyPlanService.createDailyPlan(data);
			return res;
		},
		onSuccess: () => {
			invalidateDailyPlanData();
		},
		onError: (error) => {
			toast.error('Failed to create daily plan', {
				description: getErrorMessage(error, 'Failed to create daily plan')
			});
			logErrorInDev('Failed to create daily plan', error);
		}
	});

	return createDailyplanMutation;
};
