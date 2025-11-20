'use client';

import { isTestDateRange } from '@/core/lib/helpers/index';
import { DateRange } from 'react-day-picker';
import { TDailyPlan, TUser } from '@/core/types/schemas';

/**
 * Utility function to filter daily plans by date range
 *
 * Migrated from global Jotai atoms to a pure utility function.
 * NOTE: Replacement for filteredPastPlanDataState / filteredFuturePlanDataState
 * / filteredAllPlanDataState atoms; callers now pass their own data to avoid
 * cross-screen coupling and hidden side effects.
 * This function is used by multiple components to filter plans based on date ranges.
 *
 * @param date - The date range to filter by (from/to)
 * @param data - The array of daily plans to filter
 * @returns Filtered array of daily plans that fall within the date range
 */
export const filterDailyPlan = (date: DateRange, data: TDailyPlan[]) => {
	if (!date || !data.length) return data;
	const { from, to } = date;
	if (!from && !to) {
		return data;
	}
	return data.filter((plan) => {
		const itemDate = new Date(plan.date);
		return isTestDateRange(itemDate, from, to);
	});
};

/**
 * Utility function to filter daily plan tasks by employee assignment
 *
 * This function filters tasks within daily plans to show only tasks where the specified user
 * is assigned as a member. Plans with no matching tasks are excluded from the result.
 *
 * NOTE: Task members are identified by `userId`, not `employeeId`.
 * This is because task members are associated with user accounts, not employee entities.
 *
 * @param plans - The array of daily plans to filter
 * @param user - The user to filter tasks by (checks if user is in task.members)
 * @returns Filtered array of daily plans containing only tasks where the user is a member
 *
 * @example
 * ```typescript
 * const userPlans = filterDailyPlansByEmployee(allPlans, currentUser);
 * // Returns only plans with tasks assigned to currentUser
 * ```
 */
export const filterDailyPlansByEmployee = (plans: TDailyPlan[], user: TUser | undefined): TDailyPlan[] => {
	if (!user) return plans;

	return plans
		.map((plan) => ({
			...plan,
			tasks: plan.tasks?.filter((task) => task.members?.some((member) => member.userId === user.id))
		}))
		.filter((plan) => plan.tasks && plan.tasks.length > 0);
};
