import type { IChatMessage } from '@/core/types/interfaces/common/chat';
import type { ChatTimelineItem } from './chat-timeline';
import { estimateTimelineItemSize, indexOfMessage, timelineItemKey } from './chat-virtual';

function message(id: string, extra: Partial<IChatMessage> = {}): IChatMessage {
	return {
		id,
		conversationId: 'c1',
		kind: 'message',
		body: 'Short',
		mentionsChannel: false,
		mentionsHere: false,
		alsoInConversation: false,
		replyCount: 0,
		createdAt: '2026-11-11T10:00:00.000Z',
		...extra
	};
}

const row = (value: IChatMessage, continues = false): ChatTimelineItem => ({
	type: 'message',
	message: value,
	continues
});

describe('timelineItemKey', () => {
	it('keys a row by what it shows, so a measured height survives an older page', () => {
		expect(timelineItemKey({ type: 'day', key: '2026-11-11', date: new Date(2026, 10, 11) })).toBe(
			'day:2026-11-11'
		);
		expect(timelineItemKey({ type: 'new' })).toBe('new');
		expect(timelineItemKey(row(message('m1')))).toBe('message:m1');
	});
});

describe('estimateTimelineItemSize', () => {
	it('gives a group opener its header and a continued message less', () => {
		expect(estimateTimelineItemSize(row(message('m1')))).toBeGreaterThan(
			estimateTimelineItemSize(row(message('m1'), true))
		);
	});

	it('grows with the lines of the body and what the message carries', () => {
		const short = estimateTimelineItemSize(row(message('m1')));
		const long = estimateTimelineItemSize(row(message('m1', { body: 'x'.repeat(400) })));
		const broken = estimateTimelineItemSize(row(message('m1', { body: 'a\nb\nc' })));
		expect(long).toBeGreaterThan(short);
		expect(broken).toBeGreaterThan(short);
		const rich = estimateTimelineItemSize(
			row(
				message('m1', {
					attachmentIds: ['doc'],
					taskReferences: [{ messageId: 'm1', taskId: 't1', kind: 'mention' }],
					reactions: [{ emoji: '👍', count: 1, mine: false }],
					replyCount: 2,
					pinnedAt: '2026-11-11T10:00:00.000Z'
				})
			)
		);
		expect(rich).toBeGreaterThan(short + 150);
	});

	it('keeps a deleted message and the dividers small', () => {
		expect(
			estimateTimelineItemSize(
				row(message('m1', { deletedAt: '2026-11-11T11:00:00.000Z', body: 'x'.repeat(400) }))
			)
		).toBeLessThan(60);
		expect(estimateTimelineItemSize({ type: 'new' })).toBeLessThan(40);
		expect(estimateTimelineItemSize({ type: 'day', key: 'd', date: new Date() })).toBeLessThan(40);
	});
});

describe('indexOfMessage', () => {
	it('finds the row of a message among the dividers', () => {
		const items: ChatTimelineItem[] = [
			{ type: 'day', key: 'd', date: new Date() },
			row(message('m1')),
			{ type: 'new' },
			row(message('m2'))
		];
		expect(indexOfMessage(items, 'm2')).toBe(3);
		expect(indexOfMessage(items, 'gone')).toBe(-1);
	});
});
