import { IChatMessage } from '@/core/types/interfaces/common/chat';
import { continuesGroup } from './chat-format';

/** One row of a timeline: a day divider, the "new" divider, or a message. */
export type ChatTimelineItem = { type: 'day'; key: string; date: Date } | { type: 'new' } | { type: 'message'; message: IChatMessage; continues: boolean };

/** Where the reader had got to when they opened the conversation, and who they are. */
export interface ChatReadPosition {
	lastReadMessageId?: string | null;
	lastReadAt?: string | null;
	meUserId?: string | null;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/** The local calendar day of a moment, as `YYYY-MM-DD`: two messages share a day divider when theirs are equal. */
export function dayKeyOf(date: Date | string): string {
	const moment = typeof date === 'string' ? new Date(date) : date;
	const two = (value: number) => String(value).padStart(2, '0');
	return `${moment.getFullYear()}-${two(moment.getMonth() + 1)}-${two(moment.getDate())}`;
}

/**
 * The first message that arrived after the reader's last read position and that someone else wrote, or -1. The
 * position is the last read message when the timeline holds it, their last read time otherwise; with neither, the
 * position is unknown and nothing counts as new.
 */
export function firstNewIndex(messages: readonly IChatMessage[], position: ChatReadPosition): number {
	const { lastReadMessageId, lastReadAt, meUserId } = position;
	const readIndex = lastReadMessageId ? messages.findIndex((message) => message.id === lastReadMessageId) : -1;
	const readTime = lastReadAt ? Date.parse(lastReadAt) : Number.NaN;
	if (readIndex === -1 && Number.isNaN(readTime)) return -1;
	return messages.findIndex((message, index) => {
		const isAfter = readIndex === -1 ? Date.parse(message.createdAt) > readTime : index > readIndex;
		return isAfter && !(meUserId && String(message.authorUserId ?? '') === String(meUserId));
	});
}

/**
 * A list of messages (oldest first) as the rows a timeline renders: a day divider wherever the local day changes
 * (and above the first message), the "new" divider above the first message someone else wrote after the reader's last
 * read position, and the messages, each knowing whether it continues the previous one's group. A group never continues
 * across a divider.
 */
export function timelineItems(messages: readonly IChatMessage[], position: ChatReadPosition | null = null): ChatTimelineItem[] {
	const items: ChatTimelineItem[] = [];
	const newAt = position ? firstNewIndex(messages, position) : -1;
	let previous: IChatMessage | undefined;
	let previousDay: string | null = null;
	messages.forEach((message, index) => {
		const date = new Date(message.createdAt);
		const day = dayKeyOf(date);
		let divided = false;
		if (day !== previousDay) {
			items.push({ type: 'day', key: day, date });
			previousDay = day;
			divided = true;
		}
		if (index === newAt) {
			items.push({ type: 'new' });
			divided = true;
		}
		items.push({ type: 'message', message, continues: !divided && continuesGroup(previous, message) });
		previous = message;
	});
	return items;
}

function startOfDay(date: Date): number {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function capitalised(text: string, locale: string): string {
	return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
}

/** What a day divider says: "Today", "Yesterday" (in the reader's language), or the date, with its year when it is not this one. */
export function dayLabel(date: Date, locale: string, now: Date = new Date()): string {
	// Rounded: a day with a clock change is an hour shorter or longer.
	const daysAgo = Math.round((startOfDay(now) - startOfDay(date)) / DAY);
	if (daysAgo === 0 || daysAgo === 1) {
		return capitalised(new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(daysAgo === 0 ? 0 : -1, 'day'), locale);
	}
	const sameYear = date.getFullYear() === now.getFullYear();
	return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', ...(sameYear ? {} : { year: 'numeric' }) }).format(date);
}

/** How long ago something happened, in words ("5 minutes ago", "yesterday"); a short date once it is over a week old. */
export function relativeTime(date: Date, locale: string, now: Date = new Date()): string {
	const elapsed = Math.max(0, now.getTime() - date.getTime());
	const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
	if (elapsed < MINUTE) return format.format(0, 'second');
	if (elapsed < HOUR) return format.format(-Math.floor(elapsed / MINUTE), 'minute');
	if (elapsed < DAY) return format.format(-Math.floor(elapsed / HOUR), 'hour');
	if (elapsed < WEEK) return format.format(-Math.floor(elapsed / DAY), 'day');
	const sameYear = date.getFullYear() === now.getFullYear();
	return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) }).format(date);
}

/** One formatter per locale: a timeline formats a time for every message it shows. */
const clockFormats = new Map<string, Intl.DateTimeFormat>();

function clockFormatOf(locale: string): Intl.DateTimeFormat {
	let format = clockFormats.get(locale);
	if (!format) {
		format = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' });
		clockFormats.set(locale, format);
	}
	return format;
}

/** The time of day of a message, as the reader's locale writes it ("10:45 AM", "10:45"). */
export function clockTime(date: Date, locale: string): string {
	return clockFormatOf(locale).format(date);
}

/** The same time without the day period ("10:45"), short enough for the gutter beside a grouped message. */
export function shortClockTime(date: Date, locale: string): string {
	const parts = clockFormatOf(locale).formatToParts(date);
	const hourAt = parts.findIndex((part) => part.type === 'hour');
	const minute = parts.find((part) => part.type === 'minute')?.value;
	if (hourAt === -1 || !minute) return clockTime(date, locale);
	const separator = parts[hourAt + 1]?.type === 'literal' ? parts[hourAt + 1].value : ':';
	return `${parts[hourAt].value}${separator}${minute}`;
}

/** The full date and time, for the tooltip of a time. */
export function fullDateTime(date: Date, locale: string): string {
	return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
