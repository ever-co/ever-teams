import { getDailyPlanDay } from '@/core/lib/helpers/daily-plan-day';
import { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';

export function keepPickedPlans(plans: TDailyPlan[], pickedPlanIds: readonly string[] | undefined): TDailyPlan[] {
	const hasPicks = Boolean(pickedPlanIds?.length);
	if (!hasPicks) {
		return plans;
	}
	const picked = new Set(pickedPlanIds);
	return plans.filter((plan) => picked.has(plan.id ?? ''));
}

export function planDayKeyOf(plan: Pick<TDailyPlan, 'date'>) {
	return getDailyPlanDay(plan.date);
}
