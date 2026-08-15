import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines multiple class names into a single string, merging Tailwind CSS classes
 * for optimization. Utilizes `clsx` to conditionally join class names and `twMerge`
 * to resolve Tailwind CSS conflicts.
 *
 * @param {ClassValue[]} inputs - An array of class name values to be combined.
 * @returns {string} A single string containing the merged class names.
 */
export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}

/**
 * Pads a given number with a leading zero if the number is less than 10, and
 * returns the result as a string.
 *
 * @param {number} time - Number to be formatted
 * @returns {string} Formatted time string
 */
export function getTimeDigits(time: number): string {
	return time.toString().padStart(2, '0');
}

/**
 * Checks if two given dates are equal.
 *
 * @param {Date} [date1] - The first date to compare. Defaults to the current date.
 * @param {Date} [date2] - The second date to compare. Defaults to the current date.
 * @returns {boolean} Whether the two dates are equal.
 */
export function areDatesEqual(date1 = new Date(), date2 = new Date()): boolean {
	return date1.getTime() === date2.getTime();
}

/**
 * Converts a given number of seconds into a formatted time string (HH:MM:SS).
 *
 * @param {number} seconds - The total number of seconds to format. Defaults to 0.
 * @returns {string} The formatted time string in the format HH:MM:SS.
 */
export function formatTime(seconds = 0): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;

	const formattedHours = getTimeDigits(hours);
	const formattedMinutes = getTimeDigits(minutes);
	const formattedSeconds = getTimeDigits(secs);

	return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}

/**
 * Returns the start and end dates of the week for the given date. If the given date
 * is not provided, the current date is used.
 *
 * @param {Date} [date] - The date for which to get the week start and end. Defaults
 *   to the current date.
 * @returns {Object} An object containing `start` and `end` properties, which are
 *   both `Date` objects representing the start and end of the week, respectively.
 */
export function getWeekStartAndEnd(date = new Date()) {
	const start = new Date(date);
	const day = start.getDay();
	const diff = (day === 0 ? -6 : 1) - day; // Adjust for Sunday (0) to be the last day
	start.setDate(start.getDate() + diff);

	const end = new Date(start);
	end.setDate(start.getDate() + 6); // Add 6 days to get the end of the week

	// Set time to start of the day for the start date
	start.setHours(0, 0, 0, 0);
	// Set time to the end of the day for the end date
	end.setHours(23, 59, 59, 999);

	return {
		start,
		end
	};
}

/**
 * Returns an object with `dayStart` and `dayEnd` properties representing the
 * start and end of the day (inclusive) for the given `callTime` date. If no
 * `callTime` is provided, the current date is used.
 *
 * The start date is 24 hours before the `callTime` and the end date is the
 * `callTime` itself. Both dates have the same hours, minutes, seconds, and
 * milliseconds as the `callTime`.
 *
 * The returned `dayStart` and `dayEnd` properties are formatted as
 * 'YYYY-MM-DD HH:mm:ss' strings.
 *
 * @param {Date} [callTime] - The date for which to get the start and end of the
 *   day. Defaults to the current date.
 * @returns {Object} An object with `dayStart` and `dayEnd` properties, which are
 *   both strings formatted as 'YYYY-MM-DD HH:mm:ss'.
 */
export function getStartAndEndOfDay(callTime = new Date()): { dayStart: string; dayEnd: string } {
	// Start date is 24 hours before the call time
	const start = new Date(callTime);
	start.setDate(callTime.getDate() - 1);

	// Ensure hours, minutes, seconds, and milliseconds are the same as the call time
	start.setMilliseconds(callTime.getMilliseconds());
	start.setSeconds(callTime.getSeconds());
	start.setMinutes(callTime.getMinutes());
	start.setHours(callTime.getHours());

	// End date is exactly the call time
	const end = new Date(callTime);

	// Helper function to format the date as 'YYYY-MM-DD HH:mm:ss'
	const formatDate = (date: Date): string => {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		const seconds = String(date.getSeconds()).padStart(2, '0');
		return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
	};

	return {
		dayStart: formatDate(start),
		dayEnd: formatDate(end)
	};
}
