import {
	CHAT_HISTORY_KEY,
	CHAT_HISTORY_MAX_AGE_MS,
	canPersistChatHistory,
	type ChatSession,
	type ChatHistoryScope,
	chatHistoryKey,
	clearChatHistoryForUser,
	createChatSession,
	isChatSessionExpired,
	pruneExpiredChatHistory,
	pruneExpiredChatSessions,
	readChatHistory,
	removeChatSession,
	withChatSessionMessages,
	upsertChatSession,
	writeChatHistory
} from './chat-history';
import { onLiveChatScopeChange, setLiveChatScope } from './chat-scope';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 26, 12);

function sessionAt(id: string, updatedAt: number): ChatSession {
	return { id, title: id, updatedAt, messages: [{ id: `${id}-1`, role: 'user', content: id }] };
}

describe('chat history', () => {
	const scope: ChatHistoryScope = { userId: 'user-a', workspaceId: 'workspace-a', teamId: 'team-a' };
	const storage = {
		getItem: jest.fn<string | null, [string]>(),
		setItem: jest.fn<void, [string, string]>(),
		removeItem: jest.fn<void, [string]>(),
		clear: jest.fn<void, []>(),
		key: jest.fn<string | null, [number]>(),
		length: 0
	};

	beforeEach(() => {
		jest.clearAllMocks();
		Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
		Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
	});

	afterEach(() => {
		Reflect.deleteProperty(globalThis, 'window');
		Reflect.deleteProperty(globalThis, 'localStorage');
	});

	it('creates a useful conversation title from the first user message', () => {
		const session = createChatSession([{ id: '1', role: 'user', content: 'Summarize this team activity report' }]);
		expect(session.title).toBe('Summarize this team activity report');
	});

	it('keeps the newest 50 browser-local conversations', () => {
		let sessions: ChatSession[] = Array.from({ length: 50 }, (_, index) => ({
			id: `old-${index}`,
			title: `Old ${index}`,
			updatedAt: index,
			messages: []
		}));
		const newest = { id: 'new', title: 'Newest', updatedAt: 100, messages: [] };
		sessions = upsertChatSession(sessions, newest);
		expect(sessions).toHaveLength(50);
		expect(sessions[0].id).toBe('new');
		expect(sessions.some((session) => session.id === 'old-0')).toBe(false);
	});

	it('ignores malformed browser-local history entries', () => {
		const valid = { id: 'valid', title: 'Valid', updatedAt: NOW - DAY, messages: [] };
		storage.getItem.mockReturnValue(JSON.stringify([null, 'legacy', { id: 'broken' }, valid]));

		expect(readChatHistory(scope, NOW)).toEqual([valid]);
		expect(storage.getItem).toHaveBeenCalledWith(chatHistoryKey(scope));
	});

	it('isolates history by authenticated user, workspace, and team', () => {
		const otherUser = { ...scope, userId: 'user-b' };
		const otherWorkspace = { ...scope, workspaceId: 'workspace-b' };
		const otherTeam = { ...scope, teamId: 'team-b' };

		expect(new Set([scope, otherUser, otherWorkspace, otherTeam].map(chatHistoryKey))).toHaveProperty('size', 4);
		expect(chatHistoryKey(scope)).not.toBe(CHAT_HISTORY_KEY);
	});

	it('blocks persistence until the rendered messages belong to the active scope', () => {
		const nextScope = { ...scope, workspaceId: 'workspace-b' };

		expect(canPersistChatHistory(chatHistoryKey(scope), nextScope, 1)).toBe(false);
		expect(canPersistChatHistory(chatHistoryKey(nextScope), nextScope, 1)).toBe(true);
		expect(canPersistChatHistory(chatHistoryKey(nextScope), nextScope, 0)).toBe(false);
	});

	it('clears every scoped history entry for a user on logout', () => {
		const keys = [
			chatHistoryKey(scope),
			chatHistoryKey({ ...scope, workspaceId: 'workspace-b' }),
			chatHistoryKey({ ...scope, userId: 'user-b' }),
			CHAT_HISTORY_KEY
		];
		Object.defineProperty(storage, 'length', { configurable: true, value: keys.length });
		storage.key.mockImplementation((index) => keys[index] ?? null);

		clearChatHistoryForUser(scope.userId);

		expect(storage.removeItem).toHaveBeenCalledWith(keys[0]);
		expect(storage.removeItem).toHaveBeenCalledWith(keys[1]);
		expect(storage.removeItem).toHaveBeenCalledWith(CHAT_HISTORY_KEY);
		expect(storage.removeItem).not.toHaveBeenCalledWith(keys[2]);
	});

	it('keeps chat usable when browser-local history cannot be written', () => {
		storage.setItem.mockImplementation(() => {
			throw new DOMException('Quota exceeded', 'QuotaExceededError');
		});

		expect(() => writeChatHistory(scope, [sessionAt('recent', NOW)], NOW)).not.toThrow();
	});

	describe('30-day retention', () => {
		it('keeps a conversation for 30 days after its last message, and no longer', () => {
			expect(CHAT_HISTORY_MAX_AGE_MS).toBe(30 * DAY);
			expect(isChatSessionExpired(sessionAt('a', NOW - 30 * DAY), NOW)).toBe(false);
			expect(isChatSessionExpired(sessionAt('b', NOW - 30 * DAY - 1), NOW)).toBe(true);
		});

		it('drops only the expired conversations, in their order', () => {
			const sessions = [
				sessionAt('today', NOW),
				sessionAt('old', NOW - 45 * DAY),
				sessionAt('week', NOW - 7 * DAY)
			];

			expect(pruneExpiredChatSessions(sessions, NOW).map((session) => session.id)).toEqual(['today', 'week']);
		});

		it('never returns a conversation older than 30 days and forgets it in storage', () => {
			const recent = sessionAt('recent', NOW - 2 * DAY);
			const expired = sessionAt('expired', NOW - 31 * DAY);
			const key = chatHistoryKey(scope);
			Object.defineProperty(storage, 'length', { configurable: true, value: 1 });
			storage.key.mockImplementation((index) => (index === 0 ? key : null));
			storage.getItem.mockReturnValue(JSON.stringify([recent, expired]));

			expect(readChatHistory(scope, NOW)).toEqual([recent]);
			expect(storage.setItem).toHaveBeenCalledWith(key, JSON.stringify([recent]));
		});

		it('prunes the history of every scope in the browser, not only the open one', () => {
			const keys = [chatHistoryKey(scope), chatHistoryKey({ ...scope, teamId: 'team-b' }), 'unrelated-key'];
			const stored: Record<string, string> = {
				[keys[0]]: JSON.stringify([sessionAt('current', NOW)]),
				[keys[1]]: JSON.stringify([sessionAt('forgotten', NOW - 60 * DAY)]),
				[keys[2]]: JSON.stringify([sessionAt('not-chat', NOW - 60 * DAY)])
			};
			Object.defineProperty(storage, 'length', { configurable: true, value: keys.length });
			storage.key.mockImplementation((index) => keys[index] ?? null);
			storage.getItem.mockImplementation((key) => stored[key] ?? null);

			pruneExpiredChatHistory(NOW);

			// The other team's history held only an expired conversation: its key goes away entirely.
			expect(storage.removeItem).toHaveBeenCalledWith(keys[1]);
			expect(storage.removeItem).not.toHaveBeenCalledWith(keys[0]);
			expect(storage.removeItem).not.toHaveBeenCalledWith(keys[2]);
			expect(storage.setItem).not.toHaveBeenCalled();
		});

		it('does not write expired conversations back', () => {
			writeChatHistory(scope, [sessionAt('recent', NOW), sessionAt('expired', NOW - 31 * DAY)], NOW);

			expect(storage.setItem).toHaveBeenCalledWith(
				chatHistoryKey(scope),
				JSON.stringify([sessionAt('recent', NOW)])
			);
		});
	});

	describe('deleting a conversation', () => {
		it('removes only that conversation', () => {
			const sessions = [sessionAt('a', NOW), sessionAt('b', NOW), sessionAt('c', NOW)];

			expect(removeChatSession(sessions, 'b').map((session) => session.id)).toEqual(['a', 'c']);
		});

		it('leaves nothing in the browser when the last conversation is deleted', () => {
			writeChatHistory(scope, removeChatSession([sessionAt('only', NOW)], 'only'), NOW);

			expect(storage.removeItem).toHaveBeenCalledWith(chatHistoryKey(scope));
			expect(storage.setItem).not.toHaveBeenCalled();
		});
	});

	describe('the date of a conversation', () => {
		const stored = sessionAt('stored', NOW - 20 * DAY);

		it('stays when the conversation is only opened again or shown in another view', () => {
			const reopened = [{ id: 'stored-1', role: 'user', parts: [{ type: 'text', text: 'stored' }] }];

			const sessions = withChatSessionMessages([stored], 'stored', reopened, NOW);

			expect(sessions).toEqual([stored]);
			expect(sessions[0].updatedAt).toBe(NOW - 20 * DAY);
		});

		it('stays for a conversation saved in the older content format and opened in the new one', () => {
			const legacy = { ...stored, messages: [{ id: 'stored-1', role: 'user', content: 'stored' }] };
			const reopened = [{ id: 'stored-1', role: 'user', parts: [{ type: 'text', text: 'stored' }] }];

			expect(withChatSessionMessages([legacy], 'stored', reopened, NOW)[0].updatedAt).toBe(NOW - 20 * DAY);
		});

		it('moves when a message is added', () => {
			const added = [
				...stored.messages,
				{ id: 'stored-2', role: 'assistant', parts: [{ type: 'text', text: 'An answer' }] }
			];

			const sessions = withChatSessionMessages([stored], 'stored', added, NOW);

			expect(sessions[0].updatedAt).toBe(NOW);
			expect(sessions[0].messages).toEqual(added);
		});

		it('moves when a message changes, as an answer streams in', () => {
			const answering = [...stored.messages, { id: 'stored-2', role: 'assistant', content: 'Half' }];
			const answered = [...stored.messages, { id: 'stored-2', role: 'assistant', content: 'Half an answer' }];
			const halfway = withChatSessionMessages([stored], 'stored', answering, NOW - DAY);

			expect(withChatSessionMessages(halfway, 'stored', answered, NOW)[0].updatedAt).toBe(NOW);
		});

		it('is now for a new conversation, and nothing is saved before its first message', () => {
			expect(withChatSessionMessages([stored], 'new', [], NOW)).toEqual([stored]);
			expect(
				withChatSessionMessages([stored], 'new', [{ id: 'n', role: 'user', content: 'Hi' }], NOW)[0]
			).toMatchObject({
				id: 'new',
				updatedAt: NOW
			});
		});
	});

	it('ends the live Ever SI scope before it clears the history on sign-out', () => {
		setLiveChatScope(chatHistoryKey(scope));
		const ended = jest.fn();
		const stopListening = onLiveChatScopeChange(ended);
		Object.defineProperty(storage, 'length', { configurable: true, value: 1 });
		storage.key.mockImplementation((index) => (index === 0 ? chatHistoryKey(scope) : null));

		clearChatHistoryForUser(scope.userId);
		stopListening();

		expect(ended).toHaveBeenCalledWith(null);
		// A running answer stops before the history goes, so it cannot write it back
		expect(ended.mock.invocationCallOrder[0]).toBeLessThan(storage.removeItem.mock.invocationCallOrder[0]);
	});
});
