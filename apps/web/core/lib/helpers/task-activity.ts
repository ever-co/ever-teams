import { formatPercentage } from '../utils/number.utils';

/**
 * Format activity percentage with 2 decimal places
 */
export const formatActivity = (activity: number): string => {
	return formatPercentage(activity);
};
