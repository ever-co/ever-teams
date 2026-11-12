/**
 * Dates and times on the clocks of a time zone (an IANA name such as "Europe/London"), for forms that let the person
 * type a time in a zone other than the browser's. Intl knows every zone's rules, so no time zone data ships here.
 */

/** A date and a time as date and time inputs hold them: "2026-11-12" and "14:30". */
export interface WallClock {
	date: string;
	time: string;
}

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const SLOT_MINUTES = 30;

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterOf(zone: string): Intl.DateTimeFormat {
	let formatter = formatters.get(zone);
	if (!formatter) {
		formatter = new Intl.DateTimeFormat('en-US', {
			timeZone: zone,
			hourCycle: 'h23',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
		formatters.set(zone, formatter);
	}
	return formatter;
}

function twoDigits(value: number): string {
	return String(value).padStart(2, '0');
}

/** The date and time an instant shows on the clocks of a zone. */
export function wallClockOf(instant: Date, zone: string): WallClock {
	const parts = Object.fromEntries(
		formatterOf(zone)
			.formatToParts(instant)
			.map((part) => [part.type, part.value])
	);
	return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

/** Milliseconds the zone's clocks are ahead of UTC at an instant. */
function offsetAt(instant: number, zone: string): number {
	const { date, time } = wallClockOf(new Date(instant), zone);
	const [year, month, day] = date.split('-').map(Number);
	const [hour, minute] = time.split(':').map(Number);
	return Date.UTC(year, month - 1, day, hour, minute) - (instant - (instant % MINUTE));
}

/**
 * The instant a date and time on the clocks of a zone stands for. A time the clocks show twice (when they go back) is
 * the first one; a time they skip (when they go forward) lands just past the gap, as calendars do.
 */
export function instantOf(date: string, time: string, zone: string): Date {
	const [year, month, day] = date.split('-').map(Number);
	const [hour, minute] = time.split(':').map(Number);
	const asUtc = Date.UTC(year, month - 1, day, hour, minute);
	if (Number.isNaN(asUtc)) {
		return new Date(Number.NaN);
	}
	// The zone's offsets the day before, then and the day after: a clock change between them gives two readings
	const candidates = [asUtc - DAY, asUtc, asUtc + DAY].map((moment) => asUtc - offsetAt(moment, zone));
	const shown = candidates.filter((candidate) => {
		const clock = wallClockOf(new Date(candidate), zone);
		return clock.date === date && clock.time === time;
	});
	return new Date(shown.length > 0 ? Math.min(...shown) : Math.max(...candidates));
}

/** The calendar date so many days after a date input's value. */
function dateAfter(date: string, days: number): string {
	const [year, month, day] = date.split('-').map(Number);
	const next = new Date(Date.UTC(year, month - 1, day + days));
	return `${next.getUTCFullYear()}-${twoDigits(next.getUTCMonth() + 1)}-${twoDigits(next.getUTCDate())}`;
}

/** The next half hour on the clocks of a zone: the time a meeting planned now most often starts. */
export function nextSlotIn(zone: string, now: Date = new Date()): WallClock {
	const clock = wallClockOf(now, zone);
	const [hour, minute] = clock.time.split(':').map(Number);
	const slot = Math.ceil((hour * 60 + minute + 1) / SLOT_MINUTES) * SLOT_MINUTES;
	const minutesOfDay = 24 * 60;
	return {
		date: slot >= minutesOfDay ? dateAfter(clock.date, 1) : clock.date,
		time: `${twoDigits(Math.floor((slot % minutesOfDay) / 60))}:${twoDigits(slot % 60)}`
	};
}
