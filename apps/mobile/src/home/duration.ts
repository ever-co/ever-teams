/** Whole hours and minutes of a number of seconds, for a total read in words. */
export function hoursAndMinutes(seconds: number): { hours: number; minutes: number } {
	const whole = Math.max(0, Math.floor(seconds));
	return { hours: Math.floor(whole / 3600), minutes: Math.floor((whole % 3600) / 60) };
}

function twoDigits(value: number): string {
	return String(value).padStart(2, '0');
}

/** The timer's digits: hours, minutes and seconds, `01:52:20`. A day past 99 hours keeps all its hours. */
export function clockOf(seconds: number): string {
	const whole = Math.max(0, Math.floor(seconds));
	const hours = Math.floor(whole / 3600);
	const minutes = Math.floor((whole % 3600) / 60);
	return `${twoDigits(hours)}:${twoDigits(minutes)}:${twoDigits(whole % 60)}`;
}

/**
 * A total the API counted at a moment, as it stands now: while the timer runs, the seconds since that answer are
 * added; stopped, it stays as the API said. A clock set back before the answer adds nothing.
 */
export function liveSeconds(counted: number, countedAt: number, now: number, running: boolean): number {
	if (!running) {
		return counted;
	}
	const since = Math.max(0, now - countedAt);
	return counted + Math.floor(since / 1000);
}
