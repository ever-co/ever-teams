import { useState } from 'react';
import { DateRange } from 'react-day-picker';

/**
 * Hook for managing date range filtering per tab (Future Tasks, Past Tasks, All Tasks)
 *
 * Migrated from global Jotai atoms to local state to prevent data conflicts
 * when multiple components use different date ranges simultaneously.
 *
 * @param tab - The current tab name ('Future Tasks', 'Past Tasks', 'All Tasks')
 * @returns Object containing date range and setter function
 */
export const useDateRange = (tab: string | any) => {
	const [dateFuture, setDateFuture] = useState<DateRange | undefined>(undefined);
	const [dateAllPlan, setDateAllPlan] = useState<DateRange | undefined>(undefined);
	const [datePastPlan, setDatePastPlan] = useState<DateRange | undefined>(undefined);

	switch (tab) {
		case 'Future Tasks':
			return { date: dateFuture, setDate: setDateFuture };
		case 'Past Tasks':
			return { date: datePastPlan, setDate: setDatePastPlan };
		case 'All Tasks':
		default:
			return { date: dateAllPlan, setDate: setDateAllPlan };
	}
};
