import {
	EChatConversationKind,
	EChatNotifyLevel,
	type IChatCategory,
	type IChatConversationWithState,
	type IChatMemberState
} from '@/core/types/interfaces/common/chat';
import type { ChatPerson } from './chat-format';
import {
	adjacentConversation,
	conversationOrder,
	directPartnerOf,
	needsReader,
	opensLastConversation,
	paletteConversations,
	peopleWithoutDirect
} from './chat-navigation';

const ME = 'employee-me';
const ANA = 'employee-ana';
const BO = 'employee-bo';

function state(extra: Partial<IChatMemberState> = {}): IChatMemberState {
	return {
		conversationId: '',
		role: 'member',
		notifyLevel: EChatNotifyLevel.All,
		isFavorite: false,
		unreadCount: 0,
		mentionCount: 0,
		lastReadMessageId: null,
		lastReadAt: null,
		...extra
	};
}

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
		state: state(),
		...extra
	};
}

const direct = (id: string, other: string, extra: Partial<IChatConversationWithState> = {}) =>
	conversation(id, {
		kind: EChatConversationKind.Direct,
		name: null,
		members: [
			{ employeeId: ME, userId: 'u-me', role: 'member' },
			{ employeeId: other, userId: `u-${other}`, role: 'member' }
		],
		...extra
	});

const categories: IChatCategory[] = [{ id: 'cat', name: 'Projects', position: 1 }];
const unread = state({ unreadCount: 2 });

describe('conversationOrder', () => {
	it('walks the list top to bottom: categories, channels, direct conversations', () => {
		const ordered = conversationOrder(
			[
				direct('d1', ANA, { lastMessageAt: '2026-11-11T10:00:00.000Z' }),
				conversation('general', { lastMessageAt: '2026-11-11T09:00:00.000Z' }),
				conversation('launch', { categoryId: 'cat' }),
				conversation('old', { archivedAt: '2026-11-01T00:00:00.000Z' })
			],
			categories
		);
		expect(ordered.map((item) => item.id)).toEqual(['launch', 'general', 'd1']);
	});
});

describe('needsReader', () => {
	it('counts an unread conversation unless it is muted without a mention', () => {
		expect(needsReader(conversation('a', { state: unread }))).toBe(true);
		expect(needsReader(conversation('a'))).toBe(false);
		expect(
			needsReader(conversation('a', { state: state({ unreadCount: 3, notifyLevel: EChatNotifyLevel.Muted }) }))
		).toBe(false);
		expect(
			needsReader(
				conversation('a', {
					state: state({ unreadCount: 3, mentionCount: 1, notifyLevel: EChatNotifyLevel.Muted })
				})
			)
		).toBe(true);
	});
});

describe('adjacentConversation', () => {
	const ordered = [
		conversation('a'),
		conversation('b', { state: unread }),
		conversation('c'),
		conversation('d', { state: unread })
	];
	const id = (found: IChatConversationWithState | null) => found?.id ?? null;

	it('steps to the next and the previous one, wrapping at the ends', () => {
		expect(id(adjacentConversation(ordered, 'a', 1))).toBe('b');
		expect(id(adjacentConversation(ordered, 'a', -1))).toBe('d');
		expect(id(adjacentConversation(ordered, 'd', 1))).toBe('a');
	});

	it('starts at the top or the bottom from outside the list', () => {
		expect(id(adjacentConversation(ordered, null, 1))).toBe('a');
		expect(id(adjacentConversation(ordered, 'elsewhere', -1))).toBe('d');
	});

	it('jumps to the nearest unread one, skipping the open one', () => {
		expect(id(adjacentConversation(ordered, 'a', 1, true))).toBe('b');
		expect(id(adjacentConversation(ordered, 'b', 1, true))).toBe('d');
		expect(id(adjacentConversation(ordered, 'b', -1, true))).toBe('d');
		expect(id(adjacentConversation(ordered, null, -1, true))).toBe('d');
	});

	it('answers none when nothing else waits, or the list is empty', () => {
		expect(adjacentConversation([conversation('a', { state: unread })], 'a', 1, true)).toBeNull();
		expect(adjacentConversation([conversation('a')], 'a', 1)).toBeNull();
		expect(adjacentConversation([], null, 1)).toBeNull();
	});
});

describe('paletteConversations', () => {
	const list = [
		conversation('a'),
		conversation('b', { state: unread }),
		conversation('c'),
		conversation('gone', { archivedAt: '2026-11-01T00:00:00.000Z' }),
		conversation('d'),
		conversation('e'),
		conversation('f')
	];

	it('offers a few, those waiting for the reader first, before anything is typed', () => {
		expect(paletteConversations(list, false).map((item) => item.id)).toEqual(['b', 'a', 'c', 'd', 'e']);
		expect(paletteConversations(list, false, 2).map((item) => item.id)).toEqual(['b', 'a']);
	});

	it('offers all of them once something is typed, never an archived one', () => {
		expect(paletteConversations(list, true).map((item) => item.id)).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
	});
});

describe('peopleWithoutDirect', () => {
	const ana: ChatPerson = { employeeId: ANA, name: 'Ana Silva' };
	const bo: ChatPerson = { employeeId: BO, name: 'Bo Chen' };
	const me: ChatPerson = { employeeId: ME, name: 'Me' };
	const byEmployee = new Map([ana, bo, me].map((person) => [person.employeeId, person]));

	it('offers the people no direct conversation reaches yet, by name, never the reader', () => {
		expect(peopleWithoutDirect([me, bo, ana], [direct('d1', ANA)], byEmployee, ME)).toEqual([bo]);
		expect(peopleWithoutDirect([me, bo, ana], [], byEmployee, ME)).toEqual([ana, bo]);
	});
});

describe('directPartnerOf', () => {
	it('names the other person of a direct conversation only', () => {
		expect(directPartnerOf(direct('d1', ANA), ME)).toBe(ANA);
		expect(directPartnerOf(conversation('general'), ME)).toBeNull();
		expect(directPartnerOf({ kind: EChatConversationKind.Direct, members: [] }, ME)).toBeNull();
	});
});

describe('opensLastConversation', () => {
	const base = { isConversationView: true, conversationId: null, isListLoading: false, conversationCount: 3 };

	it('is about to open a conversation on /chat while the list loads or holds one', () => {
		expect(opensLastConversation(base)).toBe(true);
		expect(opensLastConversation({ ...base, isListLoading: true, conversationCount: 0 })).toBe(true);
	});

	it('is not once a conversation is open, on Unreads or Threads, or with no conversation at all', () => {
		expect(opensLastConversation({ ...base, conversationId: 'c1' })).toBe(false);
		expect(opensLastConversation({ ...base, isConversationView: false })).toBe(false);
		expect(opensLastConversation({ ...base, conversationCount: 0 })).toBe(false);
	});
});
