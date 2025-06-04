/**
 * Formats date range to handle same-day queries correctly
 * @param startDate - Start date (string or Date)
 * @param endDate - End date (string or Date)
 * @returns Object with formatted start and end dates
 */
export function formatStartAndEndDateRange(
	startDate: string | Date,
	endDate: string | Date
): { start: string; end: string } {
	// Parse dates to ensure they are valid Date objects
	const startDateObj = new Date(startDate);
	const endDateObj = new Date(endDate);

	// Validate that dates are valid
	if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
		throw new Error('Invalid date provided. Both startDate and endDate must be valid dates.');
	}

	// Format start date to beginning of day (00:00:00.000Z)
	const startOfDay = new Date(startDateObj);
	startOfDay.setUTCHours(0, 0, 0, 0);
	const start = startOfDay.toISOString();

	// Format end date to end of day (23:59:59.999Z) if it's the same day as start date
	// or to beginning of day if it's a different day
	const endOfDay = new Date(endDateObj);
	const isSameDay = startOfDay.toDateString() === endOfDay.toDateString();

	if (isSameDay) {
		// Set to end of day to include the entire day
		endOfDay.setUTCHours(23, 59, 59, 999);
	} else {
		// Set to beginning of day for different days
		endOfDay.setUTCHours(0, 0, 0, 0);
	}
	const end = endOfDay.toISOString();

	return { start, end };
}
