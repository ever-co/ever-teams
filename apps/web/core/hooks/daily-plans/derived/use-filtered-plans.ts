import { useMemo } from 'react';
import { useProfileDailyPlans } from './use-profile-daily-plans';
import { IUseDailyPlanOptions } from '../queries';
import { useAscSortedPlans, useDescSortedPlans } from './use-sorted-plans';

/**
 * Returns daily plans scheduled for future dates (after today).
 * Plans are sorted ascending (nearest date first).
 *
 * @param employeeId - Employee ID to filter plans (optional, defaults to current user)
 * @param options - Query options ({ enabled })
 */
export const useFuturePlans = (employeeId?: string, options: IUseDailyPlanOptions = {}) => {
	const { enabled = true } = options;
	const ascSortedPlans = useAscSortedPlans(employeeId, { enabled });

	const futurePlans = useMemo(() => {
		const today = new Date();
		today.setHours(23, 59, 59, 0); // Set today time to exclude timestamps in comparization
		return ascSortedPlans?.filter((plan) => {
			const planDate = new Date(plan.date);
			// NOTE_FIX: Use > instead of >= to exclude today's plans from future plans
			// Future plans should only include dates AFTER today, not today itself
			return planDate.getTime() > today.getTime();
		});
	}, [ascSortedPlans]);

	return futurePlans;
};

/**
 * Returns daily plans from past dates (before today).
 * Plans are sorted descending (most recent first).
 *
 * @param employeeId - Employee ID to filter plans (optional, defaults to current user)
 * @param options - Query options ({ enabled })
 */
export const usePastPlans = (employeeId?: string, options: IUseDailyPlanOptions = {}) => {
	const { enabled = true } = options;
	const descSortedPlans = useDescSortedPlans(employeeId, { enabled });

	const pastPlans = useMemo(() => {
		const today = new Date();
		today.setHours(0, 0, 0, 0); // Set today time to exclude timestamps in comparization
		return descSortedPlans?.filter((plan) => {
			const planDate = new Date(plan.date);
			// NOTE_FIX: Use > instead of >= to exclude today's plans from future plans
			// Future plans should only include dates AFTER today, not today itself
			return planDate.getTime() < today.getTime();
		});
	}, [descSortedPlans]);

	return pastPlans;
};

/**
 * Returns daily plans for today's date.
 * Replaces legacy `todayPlanState` atom.
 *
 * @param employeeId - Employee ID to filter plans (optional, defaults to current user)
 * @param options - Query options ({ enabled })
 */
export const useTodayPlan = (employeeId?: string, options: IUseDailyPlanOptions = {}) => {
	const { enabled = true } = options;
	const profileDailyPlans = useProfileDailyPlans(employeeId, { enabled });

	const todayPlan = useMemo(() => {
		// NOTE: Replacement for todayPlanState atom.
		// We keep the same ISO-date prefix logic so counters/charts using
		// "today" are not affected by this refactor.
		return [...(profileDailyPlans.items ? profileDailyPlans.items : [])].filter((plan) =>
			plan.date?.toString()?.startsWith(new Date()?.toISOString().split('T')[0])
		);
	}, [profileDailyPlans]);

	return todayPlan;
};
