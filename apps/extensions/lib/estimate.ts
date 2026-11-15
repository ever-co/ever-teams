/** The hours field of a new task's estimate takes three digits. */
export const MAX_ESTIMATE_HOURS = 999;
export const MAX_ESTIMATE_MINUTES = 59;

const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_MINUTE = 60;

/** Whether a part of an estimate is a whole number from 0 to `max`, written with at most as many digits as `max`. */
function isPartWithin(part: string, max: number): boolean {
	const digits = String(max).length;
	return new RegExp(`^\\d{1,${digits}}$`).test(part) && Number(part) <= max;
}

/**
 * What an estimate field keeps of what was typed in it: the value when it is a whole number from 0 to `max` (or the
 * field was emptied), else null, and the field keeps the value it had. The same rule as estimateSecondsOf, so the
 * fields cannot hold an estimate it refuses.
 */
export function estimateFieldOf(value: string, max: number): string | null {
	if (value === '' || isPartWithin(value, max)) {
		return value;
	}
	return null;
}

/**
 * The seconds of an estimate written "hh:mm" (hours 0 to 999, minutes 0 to 59, an empty part being 0; hours alone are
 * read as hours). Null when it is not one: more parts than hours and minutes, a part that is not a whole number (a
 * sign, decimals, an exponent), minutes from 60 on, or hours beyond the field.
 */
export function estimateSecondsOf(estimate: string): number | null {
	const parts = estimate.trim().split(':');
	if (parts.length > 2) {
		return null;
	}
	const [hours = '', minutes = ''] = parts;
	const isValid =
		estimateFieldOf(hours, MAX_ESTIMATE_HOURS) !== null && estimateFieldOf(minutes, MAX_ESTIMATE_MINUTES) !== null;
	if (!isValid) {
		return null;
	}
	return Number(hours) * SECONDS_PER_HOUR + Number(minutes) * SECONDS_PER_MINUTE;
}
