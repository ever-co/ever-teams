import { useMemo } from 'react';
import { IUseDailyPlanOptions } from '../queries';
import { useProfileDailyPlans } from './use-profile-daily-plans';

/**
 * Returns daily plans sorted ascending by date (oldest first).
 *
 * @param employeeId - Employee ID (optional, defaults to current user)
 * @param options - Query options ({ enabled })
 */
export const useAscSortedPlans = (employeeId?: string, options: IUseDailyPlanOptions = {}) => {
	const { enabled = true } = options;
	const profileDailyPlans = useProfileDailyPlans(employeeId, { enabled });

	const ascSortedPlans = useMemo(() => {
		return [...(profileDailyPlans.items ? profileDailyPlans.items : [])].sort(
			(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
		);
	}, [profileDailyPlans]);

	return ascSortedPlans;
};

/**
 * Returns daily plans sorted descending by date (newest first).
 *
 * @param employeeId - Employee ID (optional, defaults to current user)
 * @param options - Query options ({ enabled })
 */
export const useDescSortedPlans = (employeeId?: string, options: IUseDailyPlanOptions = {}) => {
	const { enabled = true } = options;
	const profileDailyPlans = useProfileDailyPlans(employeeId, { enabled });

	const descSortedPlans = useMemo(() => {
		return [...(profileDailyPlans.items ? profileDailyPlans.items : [])].sort(
			(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
		);
	}, [profileDailyPlans]);

	return descSortedPlans;
};

/**
 * Returns daily plans sorted ascending by date.
 * Alias for `useAscSortedPlans` - replaces legacy `sortedPlansState` atom.
 *
 * @param employeeId - Employee ID (optional, defaults to current user)
 * @param options - Query options ({ enabled })
 */
export const useSortedPlan = (employeeId?: string, options: IUseDailyPlanOptions = {}) => {
	const { enabled = true } = options;
	const profileDailyPlans = useProfileDailyPlans(employeeId, { enabled });
	// NOTE: Replacement for sortedPlansState atom; generic sorted list
	// used by multiple views (tabs, filters, etc.).
	const sortedPlans = useMemo(() => {
		return [...(profileDailyPlans.items ? profileDailyPlans.items : [])].sort(
			(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
		);
	}, [profileDailyPlans]);

	return sortedPlans;
};
