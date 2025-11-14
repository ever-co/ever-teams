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

export const useDateRange = (tab?: string) => {
	// NOTE: We keep a single state object keyed by tab to replace
	// Replacement for dateRangeFuturePlanState / dateRangePastPlanState / dateRangeAllPlanState atoms
	// while keeping the hook API ({ date, setDate }) unchanged.
	const [ranges, setRanges] = useState<Record<DateRangeKey, DateRange | undefined>>({
		future: undefined,
		past: undefined,
		all: undefined
	});

	const key = getDateRangeKey(tab ?? 'All Tasks');
	const date = ranges[key];

	const setDate = (next: DateRange | undefined) => {
		setRanges((prev) => ({
			...prev,
			[key]: next
		}));
	};

	return { date, setDate };
};
