import { IChatMessage } from '@/core/types/interfaces/common/chat';
import { ChatTimelineItem, clockTime, dayKeyOf, dayLabel, firstNewIndex, relativeTime, shortClockTime, timelineItems } from './chat-timeline';

const ME = 'user-me';
const BO = 'user-bo';

/** A message at a local date and time (so the tests read the same in every time zone). */
function message(id: string, at: Date, authorUserId: string = BO, extra: Partial<IChatMessage> = {}): IChatMessage {
	return {
		id,
		conversationId: 'c1',
		authorUserId,
		kind: 'message',
		body: id,
		mentionsChannel: false,
		mentionsHere: false,
		alsoInConversation: false,
		replyCount: 0,
		createdAt: at.toISOString(),
		...extra
	};
}

/** The rows as a short list: `day:2026-11-09`, `new`, `m1` (a message that starts a group) or `m1+` (one that continues it). */
function shape(items: ChatTimelineItem[]): string[] {
	return items.map((item) => {
		if (item.type === 'day') return `day:${item.key}`;
		if (item.type === 'new') return 'new';
		return `${item.message.id}${item.continues ? '+' : ''}`;
	});
}

const local = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute);

describe('dayKeyOf', () => {
	it('is the local calendar day, padded', () => {
		expect(dayKeyOf(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
		expect(dayKeyOf(new Date(2026, 10, 9, 0, 0))).toBe('2026-11-09');
	});

	it('reads an ISO string in local time', () => {
		const late = new Date(2026, 10, 9, 23, 59);
		expect(dayKeyOf(late.toISOString())).toBe('2026-11-09');
	});
});

describe('timelineItems', () => {
	it('answers nothing for no messages', () => {
		expect(timelineItems([])).toEqual([]);
		expect(timelineItems([], { lastReadAt: local(9, 10).toISOString(), meUserId: ME })).toEqual([]);
	});

	it('puts a day divider above the first message and groups what follows closely', () => {
		const items = timelineItems([message('m1', local(9, 10, 0)), message('m2', local(9, 10, 2)), message('m3', local(9, 10, 30))]);
		expect(shape(items)).toEqual(['day:2026-11-09', 'm1', 'm2+', 'm3']);
	});

	it('starts a new group when the author changes', () => {
		const items = timelineItems([message('m1', local(9, 10, 0)), message('m2', local(9, 10, 1), ME), message('m3', local(9, 10, 2), ME)]);
		expect(shape(items)).toEqual(['day:2026-11-09', 'm1', 'm2', 'm3+']);
	});

	it('divides the days at local midnight, and a group never continues across the divider', () => {
		const items = timelineItems([message('m1', local(9, 23, 58)), message('m2', local(9, 23, 59)), message('m3', local(10, 0, 1)), message('m4', local(10, 0, 2))]);
		expect(shape(items)).toEqual(['day:2026-11-09', 'm1', 'm2+', 'day:2026-11-10', 'm3', 'm4+']);
		const day = items[3];
		expect(day.type === 'day' && dayKeyOf(day.date)).toBe('2026-11-10');
	});

	it('has no "new" divider when everything is read', () => {
		const messages = [message('m1', local(9, 10, 0)), message('m2', local(9, 10, 1))];
		expect(shape(timelineItems(messages, { lastReadMessageId: 'm2', lastReadAt: local(9, 10, 1).toISOString(), meUserId: ME }))).toEqual(['day:2026-11-09', 'm1', 'm2+']);
		expect(shape(timelineItems(messages, { lastReadAt: local(9, 11).toISOString(), meUserId: ME }))).toEqual(['day:2026-11-09', 'm1', 'm2+']);
	});

	it('has no "new" divider when the read position is not known', () => {
		const messages = [message('m1', local(9, 10, 0)), message('m2', local(9, 10, 1))];
		expect(shape(timelineItems(messages, { lastReadMessageId: null, lastReadAt: null, meUserId: ME }))).toEqual(['day:2026-11-09', 'm1', 'm2+']);
		expect(shape(timelineItems(messages, { lastReadMessageId: 'not-loaded', meUserId: ME }))).toEqual(['day:2026-11-09', 'm1', 'm2+']);
		expect(shape(timelineItems(messages, null))).toEqual(['day:2026-11-09', 'm1', 'm2+']);
	});

	it('puts the "new" divider after the last read message, and the group starts again under it', () => {
		const messages = [message('m1', local(9, 10, 0)), message('m2', local(9, 10, 1)), message('m3', local(9, 10, 2))];
		expect(shape(timelineItems(messages, { lastReadMessageId: 'm1', meUserId: ME }))).toEqual(['day:2026-11-09', 'm1', 'new', 'm2', 'm3+']);
	});

	it('goes by the last read time when the last read message is not in the timeline', () => {
		const messages = [message('m1', local(9, 10, 0)), message('m2', local(9, 10, 1)), message('m3', local(9, 10, 2))];
		const position = { lastReadMessageId: 'older-page', lastReadAt: local(9, 10, 1).toISOString(), meUserId: ME };
		expect(shape(timelineItems(messages, position))).toEqual(['day:2026-11-09', 'm1', 'm2+', 'new', 'm3']);
	});

	it('prefers the last read message over the last read time', () => {
		// The time can run ahead of the message (it is set the moment the reader looks): the message is the position.
		const messages = [message('m1', local(9, 10, 0)), message('m2', local(9, 10, 1))];
		const position = { lastReadMessageId: 'm1', lastReadAt: local(9, 12).toISOString(), meUserId: ME };
		expect(shape(timelineItems(messages, position))).toEqual(['day:2026-11-09', 'm1', 'new', 'm2']);
	});

	it('puts the "new" divider above the first message when it is unread, under its day divider', () => {
		const messages = [message('m1', local(9, 10, 0)), message('m2', local(9, 10, 1))];
		expect(shape(timelineItems(messages, { lastReadAt: local(8, 9).toISOString(), meUserId: ME }))).toEqual(['day:2026-11-09', 'new', 'm1', 'm2+']);
	});

	it("never starts the new messages with the reader's own", () => {
		const messages = [message('m1', local(9, 10, 0)), message('m2', local(9, 10, 1), ME), message('m3', local(9, 10, 2), ME), message('m4', local(9, 10, 3))];
		expect(shape(timelineItems(messages, { lastReadMessageId: 'm1', meUserId: ME }))).toEqual(['day:2026-11-09', 'm1', 'm2', 'm3+', 'new', 'm4']);
		// Only their own messages came after: nothing is new.
		expect(shape(timelineItems(messages.slice(0, 3), { lastReadMessageId: 'm1', meUserId: ME }))).toEqual(['day:2026-11-09', 'm1', 'm2', 'm3+']);
	});

	it('shows the day divider before the "new" divider when both fall on one message', () => {
		const messages = [message('m1', local(9, 23, 59)), message('m2', local(10, 0, 1))];
		expect(shape(timelineItems(messages, { lastReadMessageId: 'm1', meUserId: ME }))).toEqual(['day:2026-11-09', 'm1', 'day:2026-11-10', 'new', 'm2']);
	});

	it('counts every message as someone else when the reader is not known', () => {
		const messages = [message('m1', local(9, 10, 0)), message('m2', local(9, 10, 1), ME)];
		expect(firstNewIndex(messages, { lastReadMessageId: 'm1' })).toBe(1);
		expect(firstNewIndex(messages, { lastReadMessageId: 'm1', meUserId: ME })).toBe(-1);
	});
});

describe('labels', () => {
	const now = new Date(2026, 10, 10, 15, 0);

	it('names today and yesterday in the reader language, and dates the rest', () => {
		expect(dayLabel(new Date(2026, 10, 10, 0, 1), 'en', now)).toBe('Today');
		expect(dayLabel(new Date(2026, 10, 9, 23, 59), 'en', now)).toBe('Yesterday');
		// cspell:disable-next-line -- "yesterday" in German, as the browser names it
		expect(dayLabel(new Date(2026, 10, 9, 23, 59), 'de', now)).toBe('Gestern');
		expect(dayLabel(new Date(2026, 10, 3, 12, 0), 'en', now)).toBe('Tuesday, November 3');
		expect(dayLabel(new Date(2025, 11, 31, 12, 0), 'en', now)).toBe('Wednesday, December 31, 2025');
	});

	it('says how long ago in words, then a short date', () => {
		expect(relativeTime(new Date(now.getTime() - 20_000), 'en', now)).toBe('now');
		expect(relativeTime(new Date(now.getTime() - 5 * 60_000), 'en', now)).toBe('5 minutes ago');
		expect(relativeTime(new Date(now.getTime() - 3 * 3_600_000), 'en', now)).toBe('3 hours ago');
		expect(relativeTime(new Date(now.getTime() - 26 * 3_600_000), 'en', now)).toBe('yesterday');
		expect(relativeTime(new Date(now.getTime() - 3 * 86_400_000), 'en', now)).toBe('3 days ago');
		expect(relativeTime(new Date(2026, 9, 1, 12, 0), 'en', now)).toBe('Oct 1');
		expect(relativeTime(new Date(2025, 9, 1, 12, 0), 'en', now)).toBe('Oct 1, 2025');
		// A clock a little ahead of this one never reads as the future.
		expect(relativeTime(new Date(now.getTime() + 5_000), 'en', now)).toBe('now');
	});

	it('writes the time of day with and without the day period', () => {
		const at = new Date(2026, 10, 10, 15, 5);
		expect(clockTime(at, 'en-US').replace(/\s/g, ' ')).toBe('3:05 PM');
		expect(shortClockTime(at, 'en-US')).toBe('3:05');
		expect(shortClockTime(at, 'de')).toBe('15:05');
	});
});
