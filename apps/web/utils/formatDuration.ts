/**
 * Formats a duration in seconds into a human-readable string (HH:mm)
 * @param seconds Duration in seconds
 * @returns Formatted duration string
 */
export function formatDuration(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	
	return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Gets the start and end dates of a week for a given date
 * @param date The date to get the week range for
 * @returns Object containing start and end dates of the week
 */
export function getWeekRange(date: Date): { start: Date; end: Date } {
	const start = new Date(date);
	start.setDate(start.getDate() - start.getDay() + (start.getDay() === 0 ? -6 : 1)); // Start on Monday
	start.setHours(0, 0, 0, 0);

	const end = new Date(start);
	end.setDate(end.getDate() + 6);
	end.setHours(23, 59, 59, 999);

	return { start, end };
}

/**
 * Formats a date range into a string
 * @param start Start date
 * @param end End date
 * @returns Formatted date range string
 */
export function formatDateRange(start: Date, end: Date): string {
	const formatOptions: Intl.DateTimeFormatOptions = {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	};
	
	return `${start.toLocaleDateString('fr-FR', formatOptions)} - ${end.toLocaleDateString('fr-FR', formatOptions)}`;
}
