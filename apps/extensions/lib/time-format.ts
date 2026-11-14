const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
// From ten hours on, "H:MM" no longer fits the toolbar badge (four characters at most)
const BADGE_HOURS_ONLY_FROM = 10;

/** A count of seconds the clock can show: whole, and never negative. */
function wholeSeconds(totalSeconds: number): number {
	if (!Number.isFinite(totalSeconds)) {
		return 0;
	}
	return Math.max(0, Math.floor(totalSeconds));
}

function twoDigits(value: number): string {
	return String(value).padStart(2, '0');
}

/** Seconds as HH:MM:SS, the running clock of the top bar timer. Hours keep counting past a day. */
export function formatClock(totalSeconds: number): string {
	const seconds = wholeSeconds(totalSeconds);
	const hours = Math.floor(seconds / SECONDS_PER_HOUR);
	const minutes = Math.floor((seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
	const rest = seconds % SECONDS_PER_MINUTE;

	return `${twoDigits(hours)}:${twoDigits(minutes)}:${twoDigits(rest)}`;
}

/** The toolbar badge of a running timer: "H:MM" while it fits, whole hours ("12h") beyond. */
export function badgeText(totalSeconds: number): string {
	const seconds = wholeSeconds(totalSeconds);
	const hours = Math.floor(seconds / SECONDS_PER_HOUR);
	if (hours >= BADGE_HOURS_ONLY_FROM) {
		return `${hours}h`;
	}
	const minutes = Math.floor((seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);

	return `${hours}:${twoDigits(minutes)}`;
}

/** Whole seconds from a run's start to `now` (epoch milliseconds); zero for a start in the future or unreadable. */
export function secondsSince(startedAt: string, now: number): number {
	const start = Date.parse(startedAt);
	if (Number.isNaN(start)) {
		return 0;
	}
	return wholeSeconds((now - start) / 1000);
}
