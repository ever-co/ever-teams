import moment from 'moment';
import { getDailyPlanDay } from './daily-plan-day';

/**
 * Local midnight of the calendar day a date stands for. A 'YYYY-MM-DD' string, or a plan date stored at UTC
 * midnight, keeps its date; any other instant takes its day in the user's time zone.
 */
const getLocalDayStart = (date: Date): Date => {
	const day = getDailyPlanDay(date);
	const localMidnight = moment(day, 'YYYY-MM-DD');

	return localMidnight.toDate();
};

/**
 * Formats date range to handle same-day queries correctly
 *
 * The API filters on these exact instants, so both ends are taken in the user's time zone.
 *
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

	// Format start date to beginning of the local day (00:00:00.000)
	const startOfDay = getLocalDayStart(startDateObj);
	const start = startOfDay.toISOString();

	// Format end date to end of the local day, 1 ms before the next local midnight (also on DST change days)
	const lastDayStart = getLocalDayStart(endDateObj);
	const endOfLastDay = moment(lastDayStart).endOf('day');
	const end = endOfLastDay.toISOString();

	return { start, end };
}
