import { differenceInDays, format, formatDistanceToNow, isAfter, isEqual, isValid, parseISO } from "date-fns";

/* -------------------------------------------------------------------------- */
/*                          Core Date Parsing Utilities                      */
/* -------------------------------------------------------------------------- */

/**
 * Represents acceptable types for a date input across utilities.
 */
export type DateInput = string | Date | null | undefined;

/**
 * Parses a string (format YYYY-MM-DD) or a Date object into a valid Date object.
 * Unlike `new Date(string)`, this parsing avoids timezone shifts.
 *
 * @param input - Date input (string or Date).
 * @returns Valid Date object or undefined if invalid.
 *
 * @example
 * parseDateSafely("2024-01-01") // => Date('2024-01-01T00:00:00.000Z')
 * parseDateSafely(new Date()) // => Date instance
 */
export const parseDateSafely = (input: DateInput): Date | undefined => {
	if (!input) return undefined;

	if (input instanceof Date) return input;

	const [yearStr, monthStr, dayStr] = input.substring(0, 10).split("-");
	const year = Number(yearStr);
	const month = Number(monthStr);
	const day = Number(dayStr);

	if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
		return undefined;
	}

	return new Date(year, month - 1, day);
};

/**
 * Converts a date string into an ISO 8601 format.
 *
 * @param dateString - Date string input.
 * @returns ISO formatted date string or undefined.
 *
 * @example
 * convertDateStringToISO("2024-01-01") // => "2024-01-01T00:00:00.000Z"
 */
export const convertDateStringToISO = (dateString: string | undefined): string | undefined => {
	if (!dateString) return undefined;
	return new Date(dateString).toISOString();
};

/**
 * Converts a date string into epoch timestamp.
 *
 * @param dateString - Date string input.
 * @returns Number timestamp (milliseconds since epoch) or undefined.
 *
 * @example
 * convertDateStringToEpoch("2024-01-01") // => 1704067200000
 */
export const convertDateStringToEpoch = (dateString: string | undefined): number | undefined => {
	if (!dateString) return undefined;
	return new Date(dateString).getTime();
};

/* -------------------------------------------------------------------------- */
/*                          Date Formatting Utilities                        */
/* -------------------------------------------------------------------------- */

/**
 * Formats a DateInput into a custom string format.
 *
 * @param date - Date input.
 * @param formatPattern - Format pattern for `date-fns` (default: "MMM dd, yyyy").
 * @returns Formatted date string or undefined if invalid.
 *
 * @example
 * formatDate("2024-01-01") // => "Jan 01, 2024"
 * formatDate(new Date(), "yyyy-MM-dd") // => "2024-04-27"
 */
export const formatDate = (date: DateInput, formatPattern = "MMM dd, yyyy"): string | undefined => {
	const parsed = parseDateSafely(date);
	if (!parsed || !isValid(parsed)) return undefined;

	try {
		return format(parsed, formatPattern);
	} catch {
		return format(parsed, "MMM dd, yyyy");
	}
};

/**
 * Checks whether a string matches the strict date format YYYY-MM-DD.
 *
 * @param date - String input.
 * @returns True if valid, false otherwise.
 *
 * @example
 * isValidDateStringFormat("2024-01-01") // => true
 * isValidDateStringFormat("01/01/2024") // => false
 */
export const isValidDateStringFormat = (date: string): boolean => {
	return /^\d{4}-\d{2}-\d{2}$/.test(date);
};

/* -------------------------------------------------------------------------- */
/*                          Date Calculation Utilities                       */
/* -------------------------------------------------------------------------- */

/**
 * Calculates the number of days between two dates.
 *
 * @param start - Start date.
 * @param end - End date.
 * @param inclusive - Include start and end days (default: true).
 * @returns Number of days or undefined if invalid.
 *
 * @example
 * calculateDaysBetween("2024-01-01", "2024-01-10") // => 10
 */
export const calculateDaysBetween = (start: DateInput, end: DateInput, inclusive = true): number | undefined => {
	const startDate = parseDateSafely(start);
	const endDate = parseDateSafely(end);

	if (!startDate || !endDate || !isValid(startDate) || !isValid(endDate)) return undefined;

	const days = differenceInDays(endDate, startDate);
	return inclusive ? days + 1 : days;
};

/**
 * Adds a specified number of days to a given date.
 *
 * @param startDate - Starting date.
 * @param daysToAdd - Number of days to add.
 * @returns New Date object or undefined.
 *
 * @example
 * addDays("2024-01-01", 7) // => Date('2024-01-08')
 */
export const addDays = (startDate: DateInput, daysToAdd: number): Date | undefined => {
	const baseDate = parseDateSafely(startDate);
	if (!baseDate) return undefined;

	const result = new Date(baseDate);
	result.setDate(result.getDate() + daysToAdd);
	return result;
};

/**
 * Calculates the number of days left until a target date.
 *
 * @param targetDate - Future date to compare.
 * @param inclusive - Include today (default: true).
 * @returns Number of days left.
 *
 * @example
 * calculateDaysLeft("2024-12-31") // => 248
 */
export const calculateDaysLeft = (targetDate: DateInput, inclusive = true): number | undefined => {
	return calculateDaysBetween(new Date(), targetDate, inclusive);
};

/**
 * Gets the ISO week number of a given date.
 *
 * @param date - Date input.
 * @returns Week number (1-53).
 *
 * @example
 * getWeekNumber(new Date("2024-04-27")) // => 17
 */
export const getWeekNumber = (date: Date): number => {
	const startOfYear = new Date(date.getFullYear(), 0, 1);
	const daysElapsed = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
	return Math.ceil((daysElapsed + 1) / 7);
};

/* -------------------------------------------------------------------------- */
/*                         Date Comparison Utilities                         */
/* -------------------------------------------------------------------------- */

/**
 * Compares two dates for exact equality (ignoring time).
 *
 * @param date1 - First date.
 * @param date2 - Second date.
 * @returns True if dates are the same.
 *
 * @example
 * areDatesEqual("2024-01-01", "2024-01-01") // => true
 */
export const areDatesEqual = (date1: DateInput, date2: DateInput): boolean => {
	const d1 = parseDateSafely(date1);
	const d2 = parseDateSafely(date2);

	if (!d1 && !d2) return true;
	if (!d1 || !d2) return false;

	return isEqual(d1, d2);
};

/**
 * Checks if a given date is in the future relative to today.
 *
 * @param dateString - Date string input.
 * @returns True if future date.
 *
 * @example
 * isFutureDate("2025-01-01") // => true
 */
export const isFutureDate = (dateString: string): boolean => {
	const target = parseISO(dateString);
	return isValid(target) && isAfter(target, new Date());
};

/* -------------------------------------------------------------------------- */
/*                         Time Distance Utilities                           */
/* -------------------------------------------------------------------------- */

/**
 * Formats how much time has passed since a given date.
 *
 * @param input - Date input.
 * @returns Human-readable string (e.g., "3 days ago").
 *
 * @example
 * formatTimeAgo("2024-01-01") // => "4 months ago"
 */
export const formatTimeAgo = (input: string | number | Date | null): string => {
	if (!input) return "";

	const parsed = typeof input === "string" || typeof input === "number" ? parseISO(String(input)) : input;
	if (!parsed) return "";

	return formatDistanceToNow(parsed, { addSuffix: true });
};

/**
 * Formats the time passed into a very short form (s, m, h, d, mo, y).
 *
 * @param input - Date input.
 * @returns Short string.
 *
 * @example
 * formatTimeAgoShort("2023-01-01") // => "1y"
 */
export const formatTimeAgoShort = (input: string | number | Date | null): string => {
	if (!input) return "";

	const date = typeof input === "string" ? parseISO(input) : new Date(input);
	const now = new Date();
	const diffSeconds = (now.getTime() - date.getTime()) / 1000;

	if (diffSeconds < 60) return `${Math.floor(diffSeconds)}s`;
	const minutes = diffSeconds / 60;
	if (minutes < 60) return `${Math.floor(minutes)}m`;
	const hours = minutes / 60;
	if (hours < 24) return `${Math.floor(hours)}h`;
	const days = hours / 24;
	if (days < 30) return `${Math.floor(days)}d`;
	const months = days / 30;
	if (months < 12) return `${Math.floor(months)}mo`;

	return `${Math.floor(months / 12)}y`;
};

/* -------------------------------------------------------------------------- */
/*                         Time Manipulation Utilities                       */
/* -------------------------------------------------------------------------- */

/**
 * Converts hours and minutes into total minutes.
 *
 * @param hours - Number of hours.
 * @param minutes - Number of minutes.
 * @returns Total minutes.
 *
 * @example
 * convertToMinutes(2, 30) // => 150
 */
export const convertToMinutes = (hours: number, minutes: number): number => {
	return hours * 60 + minutes;
};

/**
 * Converts total minutes into an object with hours and minutes.
 *
 * @param totalMinutes - Number of minutes.
 * @returns Object { hours, minutes }.
 *
 * @example
 * convertMinutesToHoursMinutes(150) // => { hours: 2, minutes: 30 }
 */
export const convertMinutesToHoursMinutes = (totalMinutes: number): { hours: number; minutes: number } => {
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	return { hours, minutes };
};

/**
 * Formats total minutes as a string (e.g., "2h 30m").
 *
 * @param totalMinutes - Total minutes.
 * @returns Formatted string.
 *
 * @example
 * formatMinutesAsHoursMinutes(150) // => "2h 30m"
 */
export const formatMinutesAsHoursMinutes = (totalMinutes: number): string => {
	const { hours, minutes } = convertMinutesToHoursMinutes(totalMinutes);
	return `${hours ? `${hours}h ` : ""}${minutes ? `${minutes}m` : ""}`.trim();
};

/* -------------------------------------------------------------------------- */
/*                          Advanced Utility Functions                       */
/* -------------------------------------------------------------------------- */

/**
 * Estimates reading time in seconds based on word count.
 *
 * @param wordCount - Number of words.
 * @returns Estimated reading time in seconds.
 *
 * @example
 * estimateReadTimeInSeconds(400) // => 120
 */
export const estimateReadTimeInSeconds = (wordCount: number): number => {
	const wordsPerMinute = 200;
	return (wordCount / wordsPerMinute) * 60;
};

/**
 * Generates an array of ISO date strings between two dates.
 *
 * @param start - Start date.
 * @param end - End date.
 * @returns Array of { date: string } objects.
 *
 * @example
 * generateDateRangeArray("2024-01-01", "2024-01-03")
 * // => [{ date: "2024-01-02" }, { date: "2024-01-03" }]
 */
export const generateDateRangeArray = (start: string | Date, end: string | Date): Array<{ date: string }> => {
	const startDate = new Date(start);
	const endDate = new Date(end);

	const dates: { date: string }[] = [];

	while (startDate < endDate) {
		startDate.setDate(startDate.getDate() + 1);
		dates.push({ date: new Date(startDate).toISOString().split("T")[0] });
	}

	return dates;
};

/**
 * Returns the current ISO date-time.
 *
 * @returns ISO string.
 *
 * @example
 * getCurrentDateTimeISO() // => "2024-04-27T14:00:00.000Z"
 */
export const getCurrentDateTimeISO = (): string => {
	return new Date().toISOString();
};
