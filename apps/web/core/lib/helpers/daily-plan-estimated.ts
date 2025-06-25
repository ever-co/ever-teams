import { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';
import { convertHourToSeconds } from './date-and-time';

export interface IDailyPlanCompareEstimated {
	difference: boolean;
	workTimePlanned?: number;
	estimated?: boolean[] | undefined;
	plan?: TDailyPlan | undefined;
}

export const dailyPlanCompareEstimated = (plans: TDailyPlan[]): IDailyPlanCompareEstimated => {
	const plan = plans.find((plan) => plan.date?.toString()?.startsWith(new Date().toISOString().split('T')[0]));

	if (!plan) {
		return {
			difference: false,
			workTimePlanned: 0,
			estimated: [],
			plan: undefined
		};
	}

	const workTimePlanned = plan.workTimePlanned ? convertHourToSeconds(plan.workTimePlanned) : 0;
	const times =
		plan.tasks?.map((task) => task.estimate).filter((time): time is number => typeof time === 'number') ?? [];
	const estimated = plan.tasks?.map((task) => (task.estimate ?? 0) > 0);

	let estimatedTime = 0;
	if (times.length > 0) {
		estimatedTime = times.reduce((acc, cur) => acc + cur, 0) ?? 0;
	}

	const difference = dailyPlanSubtraction(estimatedTime, workTimePlanned);

	return {
		workTimePlanned,
		estimated,
		difference,
		plan
	};
};

export function dailyPlanSubtraction(estimatedTime: number, workTimePlanned: number): boolean {
	const difference = Math.abs(estimatedTime - workTimePlanned) / (60 * 2);
	return difference >= -1 && difference <= 1;
}
