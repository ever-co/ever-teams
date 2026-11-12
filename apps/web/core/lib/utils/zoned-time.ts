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
const MINUTES_OF_DAY = 24 * 60;
/** A clock change moves the clocks an hour or two: a day of half hours ahead always finds a time they show. */
const SLOTS_AHEAD = MINUTES_OF_DAY / SLOT_MINUTES;

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

/** A date and time so many minutes later on the clocks, the day carried over. */
function clockAfter(clock: WallClock, minutes: number): WallClock {
	const [hour, minute] = clock.time.split(':').map(Number);
	const total = hour * 60 + minute + minutes;
	const days = Math.floor(total / MINUTES_OF_DAY);
	const ofDay = total - days * MINUTES_OF_DAY;
	return {
		date: days === 0 ? clock.date : dateAfter(clock.date, days),
		time: `${twoDigits(Math.floor(ofDay / 60))}:${twoDigits(ofDay % 60)}`
	};
}

/**
 * The first of the half hours from `slot` on that lies past `after` and reads back as itself: what the form shows is
 * what is saved. A time the clocks skip reads as one past the gap, and the second showing of a time they repeat reads
 * as the first: both give way to the next half hour.
 */
function firstShownSlot(slot: WallClock, zone: string, after: Date): WallClock {
	let candidate = slot;
	for (let step = 0; step < SLOTS_AHEAD; step += 1) {
		const instant = instantOf(candidate.date, candidate.time, zone);
		const shown = wallClockOf(instant, zone);
		if (instant.getTime() > after.getTime() && shown.date === candidate.date && shown.time === candidate.time) {
			return candidate;
		}
		candidate = clockAfter(candidate, SLOT_MINUTES);
	}
	return candidate;
}

/** The next half hour on the clocks of a zone: the time a meeting planned now most often starts. */
export function nextSlotIn(zone: string, now: Date = new Date()): WallClock {
	const clock = wallClockOf(now, zone);
	const [hour, minute] = clock.time.split(':').map(Number);
	const minutes = hour * 60 + minute;
	const toNextSlot = Math.ceil((minutes + 1) / SLOT_MINUTES) * SLOT_MINUTES - minutes;
	return firstShownSlot(clockAfter(clock, toNextSlot), zone, now);
}

/**
 * The time proposed for a meeting planned from a day of the browser's calendar (an agenda's day), on the clocks of a
 * zone: the next half hour, or on a later day, the time of day that next half hour falls at where the browser is. The
 * zone only changes how it reads: the meeting lies on that day of the browser's calendar, where the agenda lists it.
 */
export function slotOnDay(day: Date | undefined, zone: string, now: Date = new Date()): WallClock {
	const slot = nextSlotIn(zone, now);
	if (!day) {
		return slot;
	}
	const next = instantOf(slot.date, slot.time, zone);
	const onDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), next.getHours(), next.getMinutes());
	if (onDay.getTime() <= next.getTime()) {
		return slot;
	}
	return firstShownSlot(wallClockOf(onDay, zone), zone, new Date(onDay.getTime() - MINUTE));
}
