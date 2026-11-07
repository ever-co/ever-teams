import { EInboxItemKind, EInboxItemSource, IInboxItem } from '@/core/types/interfaces/common/inbox-item';
import {
	belongsToFilter,
	filterInboxEntries,
	fromNotificationEntry,
	groupInboxEntriesByDay,
	nextFocusIndex,
	snoozeUntil,
	tabOfFilter,
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
		expect(toInboxEntry(item({ entity: 'ChatConversation', entityId: 'c1', taskId: null, metadata: { notificationType: 'Mention' } })).href).toBe('/chat/c1');
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

	it('moves the focus inside the list', () => {
		expect(nextFocusIndex(-1, 3, 1)).toBe(0);
		expect(nextFocusIndex(-1, 3, -1)).toBe(2);
		expect(nextFocusIndex(2, 3, 1)).toBe(2);
		expect(nextFocusIndex(1, 3, -1)).toBe(0);
		expect(nextFocusIndex(0, 0, 1)).toBe(-1);
	});
});
