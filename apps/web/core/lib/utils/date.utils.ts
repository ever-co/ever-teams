/**
 * Date manipulation utilities
 */

/**
 * Get the date-only string in ISO format (YYYY-MM-DD)
 *
 * @example
 * getDateString() // '2024-01-15'
 * getDateString(new Date('2024-01-15T10:30:00')) // '2024-01-15'
 * getDateString('2024-01-15T10:30:00') // '2024-01-15'
 *
 * @param date Optional date to convert. Defaults to current date.
 * @returns Date string in YYYY-MM-DD format
 */
export function getDateString(date?: Date | string | null): string {
	const d = date ? new Date(date) : new Date();
	return d.toISOString().split('T')[0];
}

/**
 * Set time to the start of the day (00:00:00.000)
 * Mutates the input date object.
 *
 * @example
 * const date = new Date('2024-01-15T15:30:00');
 * setStartOfDay(date);
 * // date is now '2024-01-15T00:00:00.000'
 *
 * @param date Date object to modify
 * @returns The same date object (for chaining)
 */
export function setStartOfDay(date: Date): Date {
	date.setHours(0, 0, 0, 0);
	return date;
}

/**
 * Set time to the end of the day (23:59:59.999)
 * Mutates the input date object.
 *
 * @example
 * const date = new Date('2024-01-15T10:00:00');
 * setEndOfDay(date);
 * // date is now '2024-01-15T23:59:59.999'
 *
 * @param date Date object to modify
 * @returns The same date object (for chaining)
 */
export function setEndOfDay(date: Date): Date {
	date.setHours(23, 59, 59, 999);
	return date;
}

/**
 * Get a new Date object set to the start of the day
 * Does not mutate the input.
 *
 * @example
 * const date = getStartOfDay(new Date('2024-01-15T15:30:00'));
 * // date is '2024-01-15T00:00:00.000'
 *
 * @param date Optional date. Defaults to current date.
 * @returns New Date object at start of day
 */
export function getStartOfDay(date?: Date | string): Date {
	const d = new Date(date || new Date());
	return setStartOfDay(d);
}

/**
 * Get a new Date object set to the end of the day
 * Does not mutate the input.
 *
 * @example
 * const date = getEndOfDay(new Date('2024-01-15T10:00:00'));
 * // date is '2024-01-15T23:59:59.999'
 *
 * @param date Optional date. Defaults to current date.
 * @returns New Date object at end of day
 */
export function getEndOfDay(date?: Date | string): Date {
	const d = new Date(date || new Date());
	return setEndOfDay(d);
}

/**
 * Get today's date string in ISO format (YYYY-MM-DD)
 *
 * @example
 * getTodayString() // '2024-01-15'
 *
 * @returns Today's date string
 */
export function getTodayString(): string {
	return getDateString();
}

/**
 * Check if a date string starts with today's date
 * Useful for filtering today's plans/tasks
 *
 * @example
 * isToday('2024-01-15T10:30:00') // true if today is 2024-01-15
 * isToday('2024-01-15') // true if today is 2024-01-15
 *
 * @param dateStr Date string to check
 * @returns True if the date string starts with today's date
 */
export function isToday(dateStr: string | null | undefined): boolean {
	if (!dateStr) return false;
	return dateStr.toString().startsWith(getTodayString());
}

/**
 * Normalize a date to ISO date string format
 * Handles various input formats including moment objects
 *
 * @example
 * normalizeDateString('2024-01-15T10:30:00Z') // '2024-01-15'
 * normalizeDateString(new Date('2024-01-15')) // '2024-01-15'
 *
 * @param date Date to normalize
 * @returns Normalized date string in YYYY-MM-DD format
 */
export function normalizeDateString(date: Date | string): string {
	// If it's already a string, extract date part and re-format to ensure consistency
	const dateStr = date.toString().split('T')[0];
	return new Date(dateStr).toISOString().split('T')[0];
}
