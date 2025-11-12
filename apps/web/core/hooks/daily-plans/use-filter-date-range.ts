'use client';

import { isTestDateRange } from '@/core/lib/helpers/index';
import { DateRange } from 'react-day-picker';
import { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';

/**
 * Utility function to filter daily plans by date range
 *
 * Migrated from global Jotai atoms to a pure utility function.
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
