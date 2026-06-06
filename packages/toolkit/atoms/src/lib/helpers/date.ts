import { fromZonedTime as zonedTimeToUtc, toZonedTime as utcToZonedTime } from 'date-fns-tz';

export function changeTimezone(date: Date, ianatz: string): Date {
	if (!ianatz) {
		throw new Error('Timezone is required');
	}
	const utcDate = zonedTimeToUtc(date, date.getTimezoneOffset().toString());
	return utcToZonedTime(utcDate, ianatz);
}

export function userTimezone(): string {
	const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const date = new Date();
	const offset = -date.getTimezoneOffset() / 60;
	const offsetStr = offset >= 0 ? `+${offset}` : `${offset}`;
	return `${timezone.replace(/_/g, ' ')} (UTC ${offsetStr})`;
}

/**
 * A helper function to parse a time string
 *
 * @param timeString - The time string to be formated.
 *
 * @returns {string} The formated time string
 */
export function formatTimeString(timeString: string): string {
	const regex = /^(?:(\d+)h)?\s*(?:(\d+)m)?$/i;
	const match = timeString.trim().match(regex);

	if (!match) {
		return '0h 0m'; // Consistent with other outputs
	}

	const hours = parseInt(match[1] || '0', 10);
	const minutes = parseInt(match[2] || '0', 10);

	if (isNaN(hours) || isNaN(minutes) || hours < 0 || minutes < 0) {
		throw new Error('Invalid time format. Expected format: #h #m, #h, or #m');
	}

	const totalMinutes = hours * 60 + minutes;
	const formattedHours = Math.floor(totalMinutes / 60);
	const formattedMinutes = totalMinutes % 60;

	let result = '';
	if (formattedHours > 0) result += `${formattedHours}h`;
	if (formattedMinutes > 0) {
		if (result) result += ' ';
		result += `${formattedMinutes}m`;
	}

	return result || '0h 0m';
}
