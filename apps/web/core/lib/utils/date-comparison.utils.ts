/**
 * Date comparison utilities for handling potentially invalid date strings
 * Used across authentication hooks for workspace selection logic
 */

/**
 * Safely converts a date string to a numeric timestamp
 * Returns 0 for invalid dates to ensure consistent comparison behavior
 * 
 * @param dateString - The date string to convert (can be null, undefined, or empty)
 * @returns A numeric timestamp or 0 for invalid dates
 */
export const safeTimestamp = (dateString?: string | null): number => {
	const timestamp = dateString ? new Date(dateString).getTime() : NaN;
	return Number.isFinite(timestamp) ? timestamp : 0;
};

/**
 * Finds the workspace with the most recent lastLoginAt date
 * Handles invalid dates gracefully by treating them as epoch (1970)
 * 
 * @param workspaces - Array of workspace objects with user.lastLoginAt property
 * @returns The workspace with the most recent login, or the first workspace if all dates are invalid
 */
export const findMostRecentWorkspace = <T extends { user: { lastLoginAt?: string | null } }>(
	workspaces: T[]
): T => {
	if (workspaces.length === 0) {
		throw new Error('Cannot find most recent workspace from empty array');
	}

	return workspaces.reduce((prev, current) => {
		return safeTimestamp(current.user.lastLoginAt) > safeTimestamp(prev.user.lastLoginAt) 
			? current 
			: prev;
	});
};
