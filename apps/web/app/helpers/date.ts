import moment from 'moment';
import * as momentTimezone from 'moment-timezone';
import { TranslationHooks } from 'next-intl';

const months: { [key: string]: string } = {
	'01': 'January',
	'02': 'February',
	'03': 'March',
	'04': 'April',
	'05': 'May',
	'06': 'June',
	'07': 'July',
	'08': 'August',
	'09': 'September',
	'10': 'October',
	'11': 'November',
	'12': 'December'
};

export function changeTimezone(date: Date, ianatz?: string) {
	const invdate = new Date(
		date.toLocaleString('en-US', {
			timeZone: ianatz
		})
	);

	const diff = date.getTime() - invdate.getTime();

	return new Date(date.getTime() - diff);
}

export function userTimezone() {
	const userTimezone = momentTimezone.tz.guess();
	const offset = momentTimezone.tz(userTimezone).format('Z');
	const formattedTimezone = `${userTimezone.replace(/_/, ' ')} (UTC ${offset})`;
	return formattedTimezone;
}

export function addHours(numOfHours: number, date = new Date()) {
	date.setTime(date.getTime() + numOfHours * 60 * 60 * 1000);

	return date;
}

export function secondsToTime(secs: number) {
	const hours = Math.floor(secs / (60 * 60));

	const divisor_for_minutes = secs % (60 * 60);
	const minutes = Math.floor(divisor_for_minutes / 60);

	const divisor_for_seconds = divisor_for_minutes % 60;
	const seconds = Math.ceil(divisor_for_seconds);

	return {
		h: hours,
		m: minutes,
		s: seconds
	};
}

export function convertMsToTime(milliseconds: number) {
	let seconds = Math.floor(milliseconds / 1000);
	let minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);

	const ms = milliseconds % 1000;
	minutes = minutes % 60;
	seconds = seconds % 60;

	// �️ If you don't want to roll hours over, e.g. 24 to 00
	// �️ comment (or remove) the line below
	// commenting next line gets you `24:00:00` instead of `00:00:00`
	// or `36:15:31` instead of `12:15:31`, etc.
	// hours = hours % 24;

	return {
		hours,
		minutes,
		seconds,
		ms,
		ms_p: Math.floor((ms * 100) / 1000)
	};
}

export const formatDateTimeString = (dateTimeString?: string) => {
	if (dateTimeString) {
		const [date, time] = dateTimeString.split('T');

		const [year, month, day] = date.split('-');
		const monthParsed = months[month];
		const formattedDate = `${+day + 1} ${monthParsed} ${year}`;

		const timeString = time.split('.')[0];
		const timeArray = timeString.split(':');
		const amPm = parseInt(timeArray[0]) >= 12 ? 'PM' : 'AM';
		const formattedTime = `${timeArray[0]}.${timeArray[1]} ${amPm}`;

		return `${formattedDate}, ${formattedTime}`;
	}

	return '';
};

export const formatDateString = (dateTimeString?: string) => {
	if (dateTimeString) {
		return moment(dateTimeString).format('DD MMM YYYY');
	}

	return '';
};

export const calculateRemainingDays = (startDate: string, endDate: string): number | undefined => {
	if (!endDate || !startDate) {
		return undefined;
	}

	return moment(endDate).diff(startDate, 'days');
};

export const tomorrowDate = moment().add(1, 'days').toDate();

export const yesterdayDate = moment().subtract(1, 'days').toDate();

export const formatDayPlanDate = (dateString: string | Date, format?: string) => {
	if (dateString.toString().length > 10) {
		dateString = dateString.toString().split('T')[0];
	}
	const date = moment(dateString, 'YYYY-MM-DD');

	if (date.isSame(moment(), 'day')) return 'Today';
	if (date.isSame(moment().add(1, 'day'), 'day')) return 'Tomorrow';
	if (date.isSame(moment().subtract(1, 'day'), 'day')) return 'Yesterday';
	if (format === 'DD MMM YYYY') return formatDateString(dateString.toString());
	return date.format('dddd, MMMM DD, YYYY');
};

// Formats a given number into hours
export const formatIntegerToHour = (number: number) => {
	// Separate decimal and in parts
	const integerPart = Math.floor(number);
	const decimalPart = number - integerPart;

	// Format int part with 'h'
	let formattedHour = `${integerPart}h`;

	// if the decimal part is not zero, add minutes
	if (decimalPart !== 0) {
		const minutes = Math.round(decimalPart * 60);
		formattedHour += `${minutes < 10 ? '0' : ''}${minutes}m`;
	}

	return formattedHour;
};

export const isTestDateRange = (itemDate: Date, from?: Date, to?: Date) => {
	if (from && to) {
		return itemDate >= from && itemDate <= to;
	} else if (from) {
		return itemDate >= from;
	} else if (to) {
		return itemDate <= to;
	} else {
		return true; // or false, depending on your default logic
	}
};

export function convertHourToSeconds(hours: number) {
	return hours * 60 * 60;
}

/**
 * A helper function to parse a time string
 *
 * @param timeString - The time string to be formated.
 *
 * @returns {string} The formated time string
 */
export function formatTimeString(timeString: string): string {
	// Extract hours and minutes using regex
	const matches = timeString.match(/(\d+)h\s*(\d+)m|\b(\d+)m\b|\b(\d+)h\b/);

	let result = '';

	if (matches) {
		const hours = matches[1] || matches[4]; // Group 1 for hours when both exist, Group 4 for hours only
		const minutes = matches[2] || matches[3]; // Group 2 for minutes when both exist, Group 3 for minutes only

		if (parseInt(hours) > 0) {
			result += `${hours}h`;
		}

		if (parseInt(minutes) > 0) {
			if (result) {
				result += ' '; // Add space if hours were included
			}
			result += `${minutes}m`;
		}
	}

	return result.length ? result : '0h 00m';
}

export const getGreeting = (t: TranslationHooks) => {
	const GREETING_TIMES = {
		MORNING_START: 5,
		AFTERNOON_START: 12,
		EVENING_START: 18
	} as const
	const currentHour = new Date().getHours();

	if (currentHour >= GREETING_TIMES.MORNING_START && currentHour < GREETING_TIMES.AFTERNOON_START) {
		return t('pages.timesheet.GREETINGS.GOOD_MORNING');
	} else if (currentHour >= GREETING_TIMES.AFTERNOON_START && currentHour < GREETING_TIMES.EVENING_START) {
		return t('pages.timesheet.GREETINGS.GOOD_AFTERNOON');
	} else {
		return t('pages.timesheet.GREETINGS.GOOD_EVENING');
	}
}

export const formatDate = (dateStr: string | Date): string => {
	try {
		return moment(dateStr).format('ddd DD MMM YYYY');
	} catch (error) {
		console.error('Invalid date format:', error);
		return '';
	}
}
