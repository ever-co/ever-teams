import { dailyPlanService } from '@/core/services/client/api';
import { TCreateDailyPlan } from '@/core/types/schemas';
import { useMutation } from '@tanstack/react-query';
import { useInvalidateDailyPlanData } from '../use-invalidate-daily-plan-data';
import { toast } from 'sonner';
import { getErrorMessage, logErrorInDev } from '@/core/lib/helpers/error-message';

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
