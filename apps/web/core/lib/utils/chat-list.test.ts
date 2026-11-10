import { EChatConversationKind, IChatCategory, IChatConversationWithState } from '@/core/types/interfaces/common/chat';
import { ChatPerson } from './chat-format';
import { badgeCount, conversationSections, filterConversations, otherPeopleOf } from './chat-list';

const ANA = 'employee-ana';
const BO = 'employee-bo';
const people = new Map<string, ChatPerson>([
	[ANA, { employeeId: ANA, name: 'Ana Silva' }],
	[BO, { employeeId: BO, name: 'Bo Chen' }]
]);

function conversation(id: string, extra: Partial<IChatConversationWithState> = {}): IChatConversationWithState {
	return {
		id,
		kind: EChatConversationKind.Channel,
		name: id,
		visibility: 'public',
		position: 0,
		isDefault: false,
		messageCount: 0,
		memberCount: 2,
		state: null,
		...extra
	};
}

const favourite = { conversationId: '', role: 'member', notifyLevel: 'all', isFavorite: true, unreadCount: 0, mentionCount: 0, lastReadMessageId: null, lastReadAt: null };
const categories: IChatCategory[] = [
	{ id: 'cat-b', name: 'Projects', position: 2 },
	{ id: 'cat-a', name: 'Company', position: 1 },
	{ id: 'cat-empty', name: 'Empty', position: 0 }
];

describe('conversationSections', () => {
	it('sorts channels into their categories (by position), plain channels and direct conversations', () => {
		const sections = conversationSections(
			[
				conversation('general'),
				conversation('launch', { categoryId: 'cat-b' }),
				conversation('news', { categoryId: 'cat-a' }),
				conversation('dm', { kind: EChatConversationKind.Direct }),
				conversation('group', { kind: EChatConversationKind.Group })
			],
			categories
		);
		expect(sections.categorised.map((group) => [group.category.name, group.channels.map((c) => c.id)])).toEqual([
			['Company', ['news']],
			['Projects', ['launch']]
		]);
		expect(sections.channels.map((c) => c.id)).toEqual(['general']);
		expect(sections.direct.map((c) => c.id).sort()).toEqual(['dm', 'group']);
	});

	it('leaves archived conversations out', () => {
		const sections = conversationSections([conversation('old', { archivedAt: '2026-01-01T00:00:00.000Z' }), conversation('general')], []);
		expect(sections.channels.map((c) => c.id)).toEqual(['general']);
	});

	it('keeps a channel of an unknown category with the plain channels', () => {
		const sections = conversationSections([conversation('orphan', { categoryId: 'gone' })], categories);
		expect(sections.categorised).toEqual([]);
		expect(sections.channels.map((c) => c.id)).toEqual(['orphan']);
	});

	it('puts favourites first, then the most recent, inside each section', () => {
		const sections = conversationSections(
			[
				conversation('quiet', { lastMessageAt: '2026-11-01T10:00:00.000Z' }),
				conversation('busy', { lastMessageAt: '2026-11-09T10:00:00.000Z' }),
				conversation('starred', { lastMessageAt: '2026-10-01T10:00:00.000Z', state: { ...favourite, conversationId: 'starred' } })
			],
			[]
		);
		expect(sections.channels.map((c) => c.id)).toEqual(['starred', 'busy', 'quiet']);
	});
});

describe('filterConversations', () => {
	const list = [conversation('general'), conversation('design-general'), conversation('Genesis'), conversation('random'), conversation('gen-old', { archivedAt: '2026-01-01T00:00:00.000Z' })];
	const titleOf = (c: IChatConversationWithState) => `#${c.name}`;

	it('answers nothing for an empty search', () => {
		expect(filterConversations(list, titleOf, '   ')).toEqual([]);
	});

	it('matches the name in any case, the names that start with the search first', () => {
		expect(filterConversations(list, titleOf, 'GEN').map((c) => c.id)).toEqual(['general', 'Genesis', 'design-general']);
	});

	it('ignores the # of a channel, typed or shown', () => {
		expect(filterConversations(list, titleOf, '#ran').map((c) => c.id)).toEqual(['random']);
	});

	it('leaves archived conversations out', () => {
		expect(filterConversations(list, titleOf, 'old')).toEqual([]);
	});
});

describe('otherPeopleOf', () => {
	it('answers everyone but the reader, those the team knows', () => {
		const members = [
			{ employeeId: ANA, userId: 'u1', role: 'member' },
			{ employeeId: BO, userId: 'u2', role: 'member' },
			{ employeeId: 'employee-gone', userId: 'u3', role: 'member' }
		];
		expect(otherPeopleOf({ members }, people, ANA).map((person) => person.name)).toEqual(['Bo Chen']);
		expect(otherPeopleOf({ members }, people, null).map((person) => person.name)).toEqual(['Ana Silva', 'Bo Chen']);
		expect(otherPeopleOf({}, people, ANA)).toEqual([]);
	});
});

describe('badgeCount', () => {
	it('caps a count at 99', () => {
		expect(badgeCount(3)).toBe('3');
		expect(badgeCount(99)).toBe('99');
		expect(badgeCount(100)).toBe('99+');
		expect(badgeCount(-1)).toBe('0');
	});
});
