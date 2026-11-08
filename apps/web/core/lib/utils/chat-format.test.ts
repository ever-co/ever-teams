import { EChatConversationKind, IChatMessage } from '@/core/types/interfaces/common/chat';
import {
	ChatPerson,
	continuesGroup,
	conversationTitle,
	draftKeyOf,
	mentionQueryAt,
	mentionedEmployeeIds,
	mergeMessages,
	plainBody,
	sortConversations,
	splitMentions,
	suggestMentions
} from './chat-format';

const ANA = '11111111-1111-4111-8111-111111111111';
const BO = '22222222-2222-4222-8222-222222222222';
const people = new Map<string, ChatPerson>([
	[ANA, { employeeId: ANA, name: 'Ana Silva' }],
	[BO, { employeeId: BO, name: 'Bo Chen' }]
]);
const conversations = new Map<string, string>([['33333333-3333-4333-8333-333333333333', 'general']]);

describe('mentions', () => {
	it('splits a body into text and chips, marking the reader', () => {
		const parts = splitMentions(`Hi <@${ANA}>, see <#33333333-3333-4333-8333-333333333333> <!here>`, people, conversations, ANA);
		expect(parts).toEqual([
			{ kind: 'text', text: 'Hi ' },
			{ kind: 'mention', employeeId: ANA, label: 'Ana Silva', isMe: true },
			{ kind: 'text', text: ', see ' },
			{ kind: 'channel', label: 'general' },
			{ kind: 'text', text: ' ' },
			{ kind: 'everyone', label: 'here' }
		]);
	});

	it('renders a plain preview and lists the mentioned employees', () => {
		const body = `Ping <@${BO}> and <@${ANA}>  now`;
		expect(plainBody(body, people, conversations)).toBe('Ping @Bo Chen and @Ana Silva now');
		expect(mentionedEmployeeIds(body)).toEqual([BO, ANA]);
	});

	it('finds the @ query under the caret and suggests people', () => {
		expect(mentionQueryAt('hello @an', 9)).toEqual({ query: 'an', start: 6 });
		expect(mentionQueryAt('hello @an there', 9)).toEqual({ query: 'an', start: 6 });
		expect(mentionQueryAt('mail me@x', 9)).toBeNull();
		expect(suggestMentions([...people.values()], 'bo').map((p) => p.name)).toEqual(['Bo Chen']);
		expect(suggestMentions([...people.values()], '').map((p) => p.name)).toEqual(['Ana Silva', 'Bo Chen']);
	});
});

describe('conversations', () => {
	it('titles a channel by name and a direct conversation by the other people', () => {
		expect(conversationTitle({ kind: EChatConversationKind.Channel, name: 'design', members: [] }, people, ANA, 'x')).toBe('#design');
		expect(
			conversationTitle(
				{ kind: EChatConversationKind.Direct, name: null, members: [{ employeeId: ANA, userId: 'u1', role: 'member' }, { employeeId: BO, userId: 'u2', role: 'member' }] },
				people,
				ANA,
				'x'
			)
		).toBe('Bo Chen');
	});

	it('sorts favourites first, then by the newest message', () => {
		const list = sortConversations([
			{ id: 'a', kind: 'channel', name: 'a', visibility: 'public', position: 0, isDefault: false, messageCount: 0, lastMessageAt: '2026-01-02T00:00:00Z', state: null, memberCount: 1 },
			{ id: 'b', kind: 'channel', name: 'b', visibility: 'public', position: 0, isDefault: false, messageCount: 0, lastMessageAt: '2026-01-03T00:00:00Z', state: null, memberCount: 1 },
			{ id: 'c', kind: 'channel', name: 'c', visibility: 'public', position: 0, isDefault: false, messageCount: 0, lastMessageAt: '2026-01-01T00:00:00Z', state: { conversationId: 'c', role: 'member', notifyLevel: 'all', isFavorite: true, unreadCount: 0, mentionCount: 0, lastReadMessageId: null, lastReadAt: null }, memberCount: 1 }
		]);
		expect(list.map((c) => c.id)).toEqual(['c', 'b', 'a']);
	});
});

describe('messages', () => {
	const message = (id: string, at: string, author = 'u1'): IChatMessage => ({
		id,
		conversationId: 'c',
		authorUserId: author,
		kind: 'message',
		body: id,
		mentionsChannel: false,
		mentionsHere: false,
		alsoInConversation: false,
		replyCount: 0,
		createdAt: at
	});

	it('groups consecutive messages of one author within five minutes', () => {
		expect(continuesGroup(message('a', '2026-01-01T10:00:00Z'), message('b', '2026-01-01T10:04:00Z'))).toBe(true);
		expect(continuesGroup(message('a', '2026-01-01T10:00:00Z'), message('b', '2026-01-01T10:06:00Z'))).toBe(false);
		expect(continuesGroup(message('a', '2026-01-01T10:00:00Z'), message('b', '2026-01-01T10:01:00Z', 'u2'))).toBe(false);
		expect(continuesGroup(undefined, message('b', '2026-01-01T10:01:00Z'))).toBe(false);
	});

	it('merges pages by id in time order', () => {
		const merged = mergeMessages([message('b', '2026-01-01T10:02:00Z'), message('a', '2026-01-01T10:01:00Z')], [message('b', '2026-01-01T10:02:00Z'), message('c', '2026-01-01T10:03:00Z')]);
		expect(merged.map((m) => m.id)).toEqual(['a', 'b', 'c']);
	});

	it('never lets an older copy replace a newer one: a deletion is final, an edit is not undone', () => {
		const at = '2026-01-01T10:01:00Z';
		const original = { ...message('a', at), body: 'first' };
		const edited = { ...original, body: 'second', editedAt: '2026-01-01T10:05:00Z' };
		const editedAgain = { ...original, body: 'third', editedAt: '2026-01-01T10:06:00Z' };
		const deleted = { ...original, body: '', editedAt: null, deletedAt: '2026-01-01T10:07:00Z' };
		const reacted = { ...edited, reactions: [{ emoji: '👍', count: 1, mine: false }] } as IChatMessage;
		const bodyOf = (held: IChatMessage, incoming: IChatMessage) => mergeMessages([held], [incoming])[0];

		expect(bodyOf(deleted, edited).deletedAt).toBe('2026-01-01T10:07:00Z');
		expect(bodyOf(edited, deleted).deletedAt).toBe('2026-01-01T10:07:00Z');
		expect(bodyOf(edited, original).body).toBe('second');
		expect(bodyOf(editedAgain, edited).body).toBe('third');
		expect(bodyOf(edited, editedAgain).body).toBe('third');
		expect(bodyOf(original, edited).body).toBe('second');
		// A reaction or a pin keeps the edit time: its copy lands.
		expect(bodyOf(edited, reacted).reactions).toHaveLength(1);
	});

	it('keys a draft by conversation and thread', () => {
		expect(draftKeyOf('c1')).toBe('chat-draft:c1');
		expect(draftKeyOf('c1', 'm1')).toBe('chat-draft:c1:m1');
		expect(draftKeyOf('c1', null, 'u1')).toBe('chat-draft:u1:c1');
		expect(draftKeyOf('c1', 'm1', 'u2')).toBe('chat-draft:u2:c1:m1');
	});
});
