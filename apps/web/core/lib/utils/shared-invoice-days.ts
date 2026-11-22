import { invoiceDayOf, todayDayKey } from '@/core/lib/utils/invoices';

/**
 * The days a shared invoice states, read the same wherever its client opens the link (#5718).
 *
 * The public read of an invoice gives its dates as instants, and not the zone the workspace dates its invoices in
 * (ever-co/ever-gauzy#12136). Every writer of an invoice stores the issue day as the first instant of that day and the
 * due day as the last instant of its own, in the zone it writes in: this app's editor and the API's recurring invoices
 * in the workspace's zone, the API's own web app in the browser's. So an instant says which day it opens or closes.
 */

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_DAY = 24 * 60;
const MS_PER_DAY = MINUTES_PER_DAY * MS_PER_MINUTE;
const LAST_MS_OF_DAY = MS_PER_DAY - 1;

/** Real UTC offsets, in minutes east of UTC, lie between UTC-12:00 and UTC+14:00, on quarter hours. */
const LOWEST_OFFSET = -12 * 60;
const HIGHEST_OFFSET = 14 * 60;
const OFFSET_STEP = 15;

/**
 * Two offsets a day apart can both make an instant the edge of a day (UTC+13 and UTC-11, UTC+14 and UTC-10): the one
 * in this span is kept. It holds New Zealand, Fiji, Tonga, Samoa, Chatham and Hawaii; outside it are only UTC-12,
 * UTC-11 (Pago Pago, Niue) and UTC+14 (Kiritimati), which only the zone in the public read can tell apart.
 */
const LIKELY_LOWEST_OFFSET = -10 * 60;
const LIKELY_HIGHEST_OFFSET = 13 * 60 + 45;

/** The zone the page reads the dates in once it re-dated them at the UTC midnight of their days. */
const DAY_ZONE = 'UTC';

interface SharedInvoiceDates {
	invoiceDate?: string | null;
	dueDate?: string | null;
	fromOrganization?: { timeZone?: string | null } | null;
	organization?: { timeZone?: string | null } | null;
}

/** What the shared page shows its dates with: the invoice, the zone its dates are read in, and today in that zone. */
export interface SharedInvoiceDays<T> {
	invoice: T;
	timeZone: string | null;
	todayKey: string;
}

/** A date of the invoice: the day it stands for, and the offset it was written at when it is the edge of a day. */
interface DateReading {
	day: string | null;
	offset: number | null;
}

function remainderOf(value: number, divisor: number): number {
	return ((value % divisor) + divisor) % divisor;
}

function isRealOffset(offset: number): boolean {
	const isInRange = offset >= LOWEST_OFFSET && offset <= HIGHEST_OFFSET;
	const isOnQuarterHour = offset % OFFSET_STEP === 0;
	return isInRange && isOnQuarterHour;
}

function isLikelyOffset(offset: number): boolean {
	return offset >= LIKELY_LOWEST_OFFSET && offset <= LIKELY_HIGHEST_OFFSET;
}

/** The real offsets at which a time of day (milliseconds since UTC midnight) is the millisecond `edgeMs` of a day. */
function offsetsToEdge(msOfDay: number, edgeMs: number): number[] {
	const gap = edgeMs - msOfDay;
	if (gap % MS_PER_MINUTE !== 0) {
		return [];
	}
	const offset = remainderOf(gap / MS_PER_MINUTE, MINUTES_PER_DAY);
	return [offset, offset - MINUTES_PER_DAY].filter(isRealOffset);
}

/**
 * The offset, in minutes east of UTC, at which `instant` is the first or the last instant of a day; null when it is
 * neither in any real zone.
 */
export function dayEdgeOffsetOf(instant: Date): number | null {
	const time = instant.getTime();
	if (Number.isNaN(time)) {
		return null;
	}
	const msOfDay = remainderOf(time, MS_PER_DAY);
	const startOffsets = offsetsToEdge(msOfDay, 0);
	const endOffsets = offsetsToEdge(msOfDay, LAST_MS_OF_DAY);
	const offsets = [...startOffsets, ...endOffsets];
	if (offsets.length <= 1) {
		return offsets[0] ?? null;
	}
	return offsets.find(isLikelyOffset) ?? null;
}

/** The day key (2026-11-22) of `instant` at `offset` minutes east of UTC. */
function dayAtOffset(instant: Date, offset: number): string {
	const shifted = new Date(instant.getTime() + offset * MS_PER_MINUTE);
	return shifted.toISOString().slice(0, 10);
}

/** A date read as the day it is the edge of, or, when it is no edge of a day, in the reader's zone. */
function readingOf(date: string | null | undefined, readerTimeZone: string | null): DateReading {
	if (!date) {
		return { day: null, offset: null };
	}
	const instant = new Date(date);
	const offset = dayEdgeOffsetOf(instant);
	if (offset === null) {
		return { day: invoiceDayOf(date, readerTimeZone), offset: null };
	}
	return { day: dayAtOffset(instant, offset), offset };
}

function utcMidnightOf(day: string | null): string | null {
	if (!day) {
		return null;
	}
	return `${day}T00:00:00.000Z`;
}

function isKnownTimeZone(timeZone: string): boolean {
	try {
		new Intl.DateTimeFormat('en-US', { timeZone });
		return true;
	} catch {
		return false;
	}
}

/** A stated zone, trimmed, when the browser knows it; null for none, an empty one or one it does not know. */
function knownTimeZoneOf(stated: string | null | undefined): string | null {
	const timeZone = stated?.trim();
	if (!timeZone) {
		return null;
	}
	if (!isKnownTimeZone(timeZone)) {
		return null;
	}
	return timeZone;
}

/**
 * The zone the workspace dates its invoices in, when the public read gives it (ever-co/ever-gauzy#12136): the sender's,
 * else the invoice's organization's, the first one the browser knows.
 */
function workspaceTimeZoneOf(invoice: SharedInvoiceDates): string | null {
	return knownTimeZoneOf(invoice.fromOrganization?.timeZone) ?? knownTimeZoneOf(invoice.organization?.timeZone);
}

/**
 * Today for the due and overdue label, on the clock its due day was read on: the offset the due date was written at,
 * or the reader's zone when the due date is no edge of a day. An invoice without a due date counts it at the offset its
 * issue date was written at.
 */
function todayKeyOf(issue: DateReading, due: DateReading, now: Date, readerTimeZone: string | null): string {
	if (due.offset !== null) {
		return dayAtOffset(now, due.offset);
	}
	const hasNoDueDay = due.day === null;
	if (hasNoDueDay && issue.offset !== null) {
		return dayAtOffset(now, issue.offset);
	}
	return todayDayKey(readerTimeZone, now);
}

/**
 * The shared invoice as its page dates it: in the workspace's zone when the public read gives it; otherwise each date
 * re-dated at the UTC midnight of the day it opens or closes, read in UTC, and today counted on the clock the due day
 * was read on, for its due and overdue label. A date that is no edge of a day is read in the reader's zone, as before.
 *
 * @param invoice The invoice the share link opened.
 * @param now The moment the page shows it.
 * @param readerTimeZone The reader's zone; null for the browser's own.
 */
export function sharedInvoiceDaysOf<T extends SharedInvoiceDates>(
	invoice: T,
	now: Date = new Date(),
	readerTimeZone: string | null = null
): SharedInvoiceDays<T> {
	const workspaceTimeZone = workspaceTimeZoneOf(invoice);
	if (workspaceTimeZone) {
		return { invoice, timeZone: workspaceTimeZone, todayKey: todayDayKey(workspaceTimeZone, now) };
	}
	const issue = readingOf(invoice.invoiceDate, readerTimeZone);
	const due = readingOf(invoice.dueDate, readerTimeZone);
	// Today is compared with the due day, so it is counted on that day's clock: it may differ from the issue day's
	const todayKey = todayKeyOf(issue, due, now, readerTimeZone);
	const isEdgeOfDay = issue.offset !== null || due.offset !== null;
	if (!isEdgeOfDay) {
		return { invoice, timeZone: readerTimeZone, todayKey };
	}
	const dated = { ...invoice, invoiceDate: utcMidnightOf(issue.day), dueDate: utcMidnightOf(due.day) };
	return { invoice: dated, timeZone: DAY_ZONE, todayKey };
}
