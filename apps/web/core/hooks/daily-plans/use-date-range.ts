import { useMemo } from 'react';
import { atom, useAtomValue, useSetAtom } from 'jotai';
import { DateRange } from 'react-day-picker';
import { dailyPlanDateRangesState } from '@/core/stores';

/**
 * Hook for managing date range filtering per tab (Future Tasks, Past Tasks, All Tasks)
 *
 * The range lives in a global atom because the date picker of the profile filter bar
 * and the plan views it filters are rendered in separate trees. It is keyed by employee
 * as well as by tab, so a range picked on one profile does not filter another profile.
 *
 * @param tab - The current tab name ('Future Tasks', 'Past Tasks', 'All Tasks')
 * @param employeeId - The employee whose plans are filtered
 * @returns Object containing date range and setter function
 */

type DateRangeKey = 'future' | 'past' | 'all';

const getDateRangeKey = (tab: string): DateRangeKey => {
	switch (tab) {
		case 'Future Tasks':
			return 'future';
		case 'Past Tasks':
			return 'past';
		case 'All Tasks':
		default:
			return 'all';
	}
};

export const useDateRange = (tab: string, employeeId: string) => {
	const key = `${employeeId}:${getDateRangeKey(tab)}`;
	// Read this entry only, so a range set for another employee or tab does not re-render this caller
	const rangeAtom = useMemo(() => atom((get) => get(dailyPlanDateRangesState)[key]), [key]);
	const date = useAtomValue(rangeAtom);
	const setRanges = useSetAtom(dailyPlanDateRangesState);

	const setDate = (next: DateRange | undefined) => {
		setRanges((prev) => (prev[key] === next ? prev : { ...prev, [key]: next }));
	};

	return { date, setDate };
};
