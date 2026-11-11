import { EInboxItemKind, EInboxItemSource, IInboxItem } from '@/core/types/interfaces/common/inbox-item';
import {
	belongsToFilter,
	filterInboxEntries,
	fromNotificationEntry,
	groupInboxEntriesByDay,
	messagePartsOfTitle,
	nextFocusIndex,
	snoozeUntil,
	tabOfFilter,
	InboxFieldRequests,
	toInboxEntry
} from './inbox-entry';

function item(overrides: Partial<IInboxItem> = {}): IInboxItem {
	return {
		id: 'i1',
		kind: EInboxItemKind.Notification,
		source: EInboxItemSource.Gauzy,
		status: 'OPEN',
		title: 'Ana Assigned you to the Task "Login"',
		body: null,
		entity: 'Task',
		entityId: 't1',
		taskId: 't1',
		externalSource: 'gauzy-notification',
		externalId: 'n1',
		metadata: { notificationType: 'Assignment', sentByEmployeeId: 'e9' },
		createdAt: '2026-11-07T10:00:00.000Z',
		recipient: { isRead: false },
		...overrides
	};
}

describe('toInboxEntry', () => {
	it('reads a platform notification: type, sender, subject, task, state', () => {
		const entry = toInboxEntry(item());
		expect(entry.type).toBe('Assignment');
		expect(entry.senderName).toBe('Ana');
		expect(entry.subject).toBe('Login');
		expect(entry.taskId).toBe('t1');
		expect(entry.sentByEmployeeId).toBe('e9');
		expect(entry.sourceGroup).toBe('tasks');
		expect(entry.isUnread).toBe(true);
		expect(entry.isDone).toBe(false);
		expect(entry.snoozedUntil).toBeNull();
	});

	it('reads the recipient state: read, archived, snoozed, done', () => {
		const entry = toInboxEntry(
			item({ recipient: { isRead: true, isArchived: true, snoozedUntil: '2026-11-08T09:00:00.000Z', doneAt: '2026-11-07T11:00:00.000Z' } })
		);
		expect(entry.isUnread).toBe(false);
		expect(entry.isArchived).toBe(true);
		expect(entry.isDone).toBe(true);
		expect(entry.snoozedUntil?.toISOString()).toBe('2026-11-08T09:00:00.000Z');
	});

	it('groups by what the item points at, and keeps an unknown kind as its own title', () => {
		expect(toInboxEntry(item({ kind: EInboxItemKind.Email, source: EInboxItemSource.Email })).sourceGroup).toBe('email');
		expect(toInboxEntry(item({ source: EInboxItemSource.EverWorks, taskId: null, entity: null })).sourceGroup).toBe('integrations');
		const conversation = item({ entity: 'ChatConversation', entityId: 'c1', taskId: null, metadata: { notificationType: 'Mention' } });
		// A conversation opens its chat page only where the deployment has the chat pages.
		const chatFlag = process.env.NEXT_PUBLIC_CHAT_ENABLED;
		try {
			delete process.env.NEXT_PUBLIC_CHAT_ENABLED;
			expect(toInboxEntry(conversation).href).toBeNull();
			process.env.NEXT_PUBLIC_CHAT_ENABLED = 'true';
			expect(toInboxEntry(conversation).href).toBe('/chat/c1');
		} finally {
			if (chatFlag === undefined) delete process.env.NEXT_PUBLIC_CHAT_ENABLED;
			else process.env.NEXT_PUBLIC_CHAT_ENABLED = chatFlag;
		}
		const question = toInboxEntry(item({ kind: EInboxItemKind.Question, title: 'Approve the budget?', metadata: null, taskId: null, entity: null }));
		expect(question.type).toBeNull();
		expect(question.rawTitle).toBe('Approve the budget?');
		expect(question.awaitsDecision).toBe(true);
	});

	it("adapts the bell's own entry for a platform without the extension", () => {
		const entry = fromNotificationEntry({
			id: 'n1',
			type: 'Mention' as never,
			isUnread: true,
			senderName: 'Bo',
			senderImageUrl: null,
			subject: 'Login',
			rawTitle: 'Bo Mentioned you in the Task "Login"',
			message: null,
			taskId: 't1',
			href: null,
			createdAt: new Date('2026-11-07T10:00:00.000Z')
		});
		expect(entry.taskId).toBe('t1');
		expect(entry.sourceGroup).toBe('tasks');
		expect(entry.kind).toBe(EInboxItemKind.Notification);
	});
});

describe('filters', () => {
	const now = new Date('2026-11-07T12:00:00.000Z');
	const open = toInboxEntry(item({ id: 'a' }));
	const snoozed = toInboxEntry(item({ id: 'b', recipient: { isRead: false, snoozedUntil: '2026-11-08T09:00:00.000Z' } }));
	const done = toInboxEntry(item({ id: 'c', recipient: { isRead: true, doneAt: '2026-11-07T11:00:00.000Z' } }));
	const archived = toInboxEntry(item({ id: 'd', recipient: { isRead: true, isArchived: true } }));
	const mention = toInboxEntry(item({ id: 'e', metadata: { notificationType: 'Mention' } }));

	it('places snoozed, done and archived entries in their own lists', () => {
		expect(belongsToFilter(open, 'all', now)).toBe(true);
		expect(belongsToFilter(snoozed, 'all', now)).toBe(false);
		expect(belongsToFilter(snoozed, 'snoozed', now)).toBe(true);
		expect(belongsToFilter(done, 'done', now)).toBe(true);
		expect(belongsToFilter(done, 'unread', now)).toBe(false);
		expect(belongsToFilter(archived, 'archived', now)).toBe(true);
		expect(belongsToFilter(archived, 'done', now)).toBe(false);
	});

	it('narrows by type and by source', () => {
		expect(filterInboxEntries([open, mention, snoozed], 'mentions').map((e) => e.id)).toEqual(['e']);
		expect(filterInboxEntries([open, mention], 'assigned').map((e) => e.id)).toEqual(['a']);
		expect(filterInboxEntries([open, mention], 'all', 'chat')).toEqual([]);
	});

	it('maps the filters onto the platform tabs', () => {
		expect(tabOfFilter('unread')).toBe('all');
		expect(tabOfFilter('snoozed')).toBe('snoozed');
		expect(tabOfFilter('done')).toBe('done');
		expect(tabOfFilter('archived')).toBe('archived');
	});
});

describe('snoozeUntil', () => {
	it('answers later today, tomorrow at nine and next Monday at nine', () => {
		const wednesday = new Date(2026, 10, 4, 10, 30); // 4 November 2026 is a Wednesday
		expect(snoozeUntil('laterToday', wednesday).getTime()).toBe(wednesday.getTime() + 3 * 60 * 60 * 1000);
		const tomorrow = snoozeUntil('tomorrow', wednesday);
		expect([tomorrow.getDate(), tomorrow.getHours(), tomorrow.getMinutes()]).toEqual([5, 9, 0]);
		const nextWeek = snoozeUntil('nextWeek', wednesday);
		expect([nextWeek.getDay(), nextWeek.getDate(), nextWeek.getHours()]).toEqual([1, 9, 9]);
	});

	it('moves a late "later today" to tomorrow morning', () => {
		const evening = new Date(2026, 10, 4, 19, 0);
		const later = snoozeUntil('laterToday', evening);
		expect([later.getDate(), later.getHours()]).toEqual([5, 9]);
	});
});

describe('grouping and focus', () => {
	it('groups entries by day in the order given', () => {
		const now = new Date(2026, 10, 7, 12, 0);
		const entries = [
			toInboxEntry(item({ id: 't', createdAt: new Date(2026, 10, 7, 9, 0).toISOString() })),
			toInboxEntry(item({ id: 'y', createdAt: new Date(2026, 10, 6, 23, 0).toISOString() })),
			toInboxEntry(item({ id: 'e', createdAt: new Date(2026, 10, 1, 9, 0).toISOString() }))
		];
		expect(groupInboxEntriesByDay(entries, now).map((group) => [group.day, group.entries.map((e) => e.id)])).toEqual([
			['today', ['t']],
			['yesterday', ['y']],
			['earlier', ['e']]
		]);
	});

	it('takes yesterday as the previous calendar day, also across a daylight-saving change', () => {
		const zone = process.env.TZ;
		process.env.TZ = 'America/New_York';
		try {
			// 1 November 2026 lasts 25 hours in New York (clocks go back at 02:00).
			const now = new Date(2026, 10, 2, 10, 0);
			const entries = [
				toInboxEntry(item({ id: 'early', createdAt: new Date(2026, 10, 1, 0, 30).toISOString() })),
				toInboxEntry(item({ id: 'before', createdAt: new Date(2026, 9, 31, 23, 30).toISOString() }))
			];
			expect(groupInboxEntriesByDay(entries, now).map((group) => [group.day, group.entries.map((e) => e.id)])).toEqual([
				['yesterday', ['early']],
				['earlier', ['before']]
			]);
		} finally {
			if (zone === undefined) delete process.env.TZ;
			else process.env.TZ = zone;
		}
	});

	it('moves the focus inside the list', () => {
		expect(nextFocusIndex(-1, 3, 1)).toBe(0);
		expect(nextFocusIndex(-1, 3, -1)).toBe(2);
		expect(nextFocusIndex(2, 3, 1)).toBe(2);
		expect(nextFocusIndex(1, 3, -1)).toBe(0);
		expect(nextFocusIndex(0, 0, 1)).toBe(-1);
	});
});

describe('chat notifications', () => {
	const chat = (title: string, overrides: Partial<IInboxItem> = {}) =>
		toInboxEntry(item({ title, entity: 'ChatMessage', entityId: 'm1', taskId: null, metadata: { notificationType: 'Message', sentByEmployeeId: 'e9' }, ...overrides }));

	it('reads the text of a direct message from the title, with no channel', () => {
		const entry = chat('Ana sent you a message: See you at 13:30');
		expect(entry.senderName).toBe('Ana');
		expect(entry.subject).toBeNull();
		expect(entry.message).toBe('See you at 13:30');
		expect(entry.chatMessageId).toBe('m1');
		expect(entry.sourceGroup).toBe('chat');
	});

	it('reads the channel and the text of a thread reply, and the name of who replied', () => {
		const entry = chat('Ana replied in a thread you follow in #general: Is staging on the latest build?');
		expect(entry.senderName).toBe('Ana');
		expect(entry.subject).toBe('#general');
		expect(entry.message).toBe('Is staging on the latest build?');
	});

	it('does not take a quote inside the message for the subject, and keeps colons of the text', () => {
		const entry = chat('Ana sent you a message: The "final" plan: ship on Friday');
		expect(entry.subject).toBeNull();
		expect(entry.message).toBe('The "final" plan: ship on Friday');
	});

	it('reads the sender from the head of the title, whatever the message says', () => {
		expect(chat('Ana sent you a message: we published it').senderName).toBe('Ana');
		expect(chat('Ana replied in a thread you follow in #general: I sent the report').senderName).toBe('Ana');
		expect(chat('Ana replied in a thread you follow in #general: she Assigned it and Mentioned me').senderName).toBe('Ana');
	});

	it('names the channel of a mention as a channel', () => {
		const entry = toInboxEntry(
			item({ title: 'Ana Mentioned you on the ChatConversation "general"', entity: 'ChatConversation', entityId: 'c1', taskId: null, metadata: { notificationType: 'Mention' } })
		);
		expect(entry.subject).toBe('#general');
		expect(entry.chatMessageId).toBeNull();
	});

	it('prefers the body of an item over the text read from its title', () => {
		expect(chat('Ana sent you a message: short', { body: 'The whole message' }).message).toBe('The whole message');
	});

	it('leaves a task notification as it was', () => {
		const entry = toInboxEntry(item());
		expect(entry.subject).toBe('Login');
		expect(entry.message).toBeNull();
		expect(entry.chatMessageId).toBeNull();
	});
});

describe('messagePartsOfTitle', () => {
	it('splits the channel and the text', () => {
		expect(messagePartsOfTitle('Ana replied in a thread you follow in #design-review: Looks good')).toEqual({ place: '#design-review', preview: 'Looks good' });
		expect(messagePartsOfTitle('Ana sent you a message: Hi')).toEqual({ place: null, preview: 'Hi' });
		expect(messagePartsOfTitle('Ana sent you a message')).toEqual({ place: null, preview: null });
		expect(messagePartsOfTitle('Ana sent you a message: ')).toEqual({ place: null, preview: null });
	});
});

/**
 * Without the inbox extension the pane's copy of an entry that left the list is all it has; when the platform refuses
 * a read or an archive, the bell's cache rolls back on its own and the copy has to as well, whatever order the answers
 * come in.
 */
describe('InboxFieldRequests', () => {
	const entry = toInboxEntry(item({ recipient: { isRead: true, isArchived: false } }));

	it('holds the last accepted value once every request answered, nothing before', () => {
		const requests = new InboxFieldRequests();
		const archive = requests.start([entry], 'isArchived', true);
		const unarchive = requests.start([{ ...entry, isArchived: true }], 'isArchived', false);
		expect(requests.settle(entry.id, 'isArchived', unarchive, true)).toBeUndefined();
		expect(requests.settle(entry.id, 'isArchived', archive, true)).toBe(false);
	});

	it('archive then unarchive, both refused, the unarchive answering first: not archived', () => {
		const requests = new InboxFieldRequests();
		const archive = requests.start([entry], 'isArchived', true);
		const unarchive = requests.start([{ ...entry, isArchived: true }], 'isArchived', false);
		expect(requests.settle(entry.id, 'isArchived', unarchive, false)).toBeUndefined();
		expect(requests.settle(entry.id, 'isArchived', archive, false)).toBe(false);
	});

	it('archive, unarchive, archive again, the first one refused last: archived', () => {
		const requests = new InboxFieldRequests();
		const first = requests.start([entry], 'isArchived', true);
		const second = requests.start([{ ...entry, isArchived: true }], 'isArchived', false);
		const third = requests.start([entry], 'isArchived', true);
		expect(requests.settle(entry.id, 'isArchived', second, true)).toBeUndefined();
		expect(requests.settle(entry.id, 'isArchived', third, true)).toBeUndefined();
		expect(requests.settle(entry.id, 'isArchived', first, false)).toBe(true);
	});

	it('keeps each entry and each field apart, and starts again from the entry once a field settled', () => {
		const requests = new InboxFieldRequests();
		const other = { ...entry, id: 'other' };
		const read = requests.start([entry, other], 'isUnread', false);
		const archive = requests.start([entry], 'isArchived', true);
		expect(requests.settle(entry.id, 'isUnread', read, false)).toBe(entry.isUnread);
		expect(requests.settle(other.id, 'isUnread', read, true)).toBe(false);
		expect(requests.settle(entry.id, 'isArchived', archive, false)).toBe(false);

		const again = requests.start([{ ...entry, isUnread: true }], 'isUnread', false);
		expect(requests.settle(entry.id, 'isUnread', again, false)).toBe(true);
		expect(requests.settle('unknown', 'isUnread', again, false)).toBeUndefined();
	});
});
