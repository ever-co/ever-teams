import { useMemo } from 'react';
import { IUseDailyPlanOptions } from '../queries';
import { useFuturePlans, useTodayPlan } from './use-filtered-plans';

export const useTodayTasks = (employeeId?: string, options: IUseDailyPlanOptions = {}) => {
	const { enabled = true } = options;
	const todayPlan = useTodayPlan(employeeId, { enabled });

	// NOTE: Replacement for todayTasksState atom; derived locally from todayPlan.
	const todayTasks = useMemo(() => {
		return todayPlan.flatMap((plan) => plan.tasks ?? []);
	}, [todayPlan]);

	return todayTasks;
};

export const useFutureTasks = (employeeId?: string, options: IUseDailyPlanOptions = {}) => {
	const { enabled = true } = options;
	const futurePlans = useFuturePlans(employeeId, { enabled });

	// NOTE: Replacement for futureTasksState atom; keeps future task list
	// local to this hook instead of global Jotai.
	const futureTasks = useMemo(() => {
		return futurePlans.flatMap((plan) => plan.tasks ?? []);
	}, [futurePlans]);

	return futureTasks;
};
