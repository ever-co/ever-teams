import { dailyPlanService } from '@/core/services/client/api';
import { TUpdateDailyPlan } from '@/core/types/schemas';
import { useMutation } from '@tanstack/react-query';
import { useInvalidateDailyPlanData } from '../use-invalidate-daily-plan-data';

export const useUpdateDailyPlanMutation = () => {
	const invalidateDailyPlanData = useInvalidateDailyPlanData();

	const updateDailyPlanMutation = useMutation({
		mutationFn: async ({ dailyPlanId, data }: { dailyPlanId: string; data: TUpdateDailyPlan }) => {
			// The server requires `employeeId` in all update requests.
			// This value may represent either:
			// - the current owner of the plan, or
			// - a new owner, if the plan is being reassigned.
			let employeeId = data?.employeeId;
			if (!employeeId) {
				// If `employeeId` is not provided in the payload, we fetch the existing plan
				// to retrieve its current owner before sending the update request.
				const plan = await dailyPlanService.getPlanById(dailyPlanId);
				if (!plan.employeeId) throw new Error('Assign this plan to an employee before any update');
				employeeId = plan.employeeId;
			}
			const res = await dailyPlanService.updateDailyPlan({ ...data, employeeId }, dailyPlanId);
			return res;
		},
		onSuccess: (data) => {
			invalidateDailyPlanData();
		}
	});

	return updateDailyPlanMutation;
};
