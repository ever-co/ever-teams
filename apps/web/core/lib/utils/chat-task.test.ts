import { EChatTaskReferenceKind, IChatMessage } from '@/core/types/interfaces/common/chat';
import { CHAT_TASK_TITLE_MAX, chatTaskTitleOf, sendableConversations, sendToChatBodyOf, withTaskReference } from './chat-task';

const ANA = '11111111-1111-4111-8111-111111111111';

describe('chatTaskTitleOf', () => {
	it('takes the first line with text, mention tokens dropped and spaces collapsed', () => {
		expect(chatTaskTitleOf(`\n  <@${ANA}>   fix the   login page <!here>\nsecond line`)).toBe('fix the login page');
		expect(chatTaskTitleOf('<!channel>\r\n\r\nShip it\r\nnow')).toBe('Ship it');
	});

	it('answers an empty title for a message with no text', () => {
		expect(chatTaskTitleOf(`<@${ANA}> <!here>`)).toBe('');
		expect(chatTaskTitleOf(null)).toBe('');
	});

	it("cuts to the platform's limit with an ellipsis, never splitting an emoji", () => {
		const long = 'a'.repeat(400);
		expect(chatTaskTitleOf(long)).toHaveLength(CHAT_TASK_TITLE_MAX);
		expect(chatTaskTitleOf(long).endsWith('…')).toBe(true);
		// The 254th UTF-16 unit would be the first half of the emoji: the cut drops the whole emoji.
		const title = chatTaskTitleOf(`${'b'.repeat(253)}😀tail`);
		expect(title).toBe(`${'b'.repeat(253)}…`);
		expect(title.length).toBeLessThanOrEqual(CHAT_TASK_TITLE_MAX);
	});
});

describe('sendToChatBodyOf', () => {
	it("says the note, or the task's title when there is none", () => {
		expect(sendToChatBodyOf('  can you look?  ', 'Fix login')).toBe('can you look?');
		expect(sendToChatBodyOf('   ', '  Fix login ')).toBe('Fix login');
		expect(sendToChatBodyOf('x'.repeat(10), 'T', 4)).toBe('xxxx');
	});
});

describe('sendableConversations', () => {
	const list = [
		{ id: 'general', archivedAt: null },
		{ id: 'old', archivedAt: '2026-01-01T00:00:00Z' },
		{ id: 'Design', archivedAt: null }
	];

	it('leaves archived conversations out and searches the titles in any case', () => {
		expect(sendableConversations(list, (c) => c.id, '').map((c) => c.id)).toEqual(['general', 'Design']);
		expect(sendableConversations(list, (c) => c.id, ' des ').map((c) => c.id)).toEqual(['Design']);
		expect(sendableConversations(list, (c) => c.id, 'old')).toEqual([]);
	});
});

describe('withTaskReference', () => {
	const message: IChatMessage = {
		id: 'm',
		conversationId: 'c',
		authorUserId: 'u',
		kind: 'message',
		body: 'Fix login',
		mentionsChannel: false,
		mentionsHere: false,
		alsoInConversation: false,
		replyCount: 0,
		createdAt: '2026-01-01T10:00:00Z',
		taskReferences: [{ messageId: 'm', taskId: 't1', kind: EChatTaskReferenceKind.Mention }]
	};

	it('adds the reference once, replacing one to the same task', () => {
		const created = { messageId: 'm', taskId: 't2', kind: EChatTaskReferenceKind.Created };
		expect(withTaskReference(message, created).taskReferences).toEqual([message.taskReferences?.[0], created]);
		const again = { messageId: 'm', taskId: 't1', kind: EChatTaskReferenceKind.Created };
		expect(withTaskReference(message, again).taskReferences).toEqual([again]);
		expect(message.taskReferences).toHaveLength(1);
	});
});
