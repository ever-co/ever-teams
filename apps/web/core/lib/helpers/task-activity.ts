/**
 * Format activity percentage with 2 decimal places
 */
export const formatActivity = (activity: number): string => {
	return `${activity.toFixed(2)}%`;
};
