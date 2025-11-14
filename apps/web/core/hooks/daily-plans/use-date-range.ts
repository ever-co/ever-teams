import { useState } from 'react';
import { DateRange } from 'react-day-picker';

/**
 * Hook for managing date range filtering per tab (Future Tasks, Past Tasks, All Tasks)
 *
 * Migrated from global Jotai atoms to local state to prevent data conflicts
 * when multiple components use different date ranges simultaneously.
 * NOTE: Date ranges are now view-local; we no longer share them between
 * profiles or tabs via global atoms.
 *
 * @param tab - The current tab name ('Future Tasks', 'Past Tasks', 'All Tasks')
 * @returns Object containing date range and setter function
 */
export const useDateRange = (tab: string | any) => {
	// NOTE: Replacement for dateRangeFuturePlanState atom; range is now
	// scoped to this view/tab instead of a global Jotai store.
	const [dateFuture, setDateFuture] = useState<DateRange | undefined>(undefined);
	// NOTE: Replacement for dateRangeAllPlanState atom; keeps "All" tab
	// date range local to the caller.
	const [dateAllPlan, setDateAllPlan] = useState<DateRange | undefined>(undefined);
	// NOTE: Replacement for dateRangePastPlanState atom; used for Past Tasks
	// history filters.
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
