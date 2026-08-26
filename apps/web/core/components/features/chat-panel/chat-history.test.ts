import {
	CHAT_HISTORY_KEY,
	type ChatSession,
	type ChatHistoryScope,
	chatHistoryKey,
	clearChatHistoryForUser,
	createChatSession,
	readChatHistory,
	upsertChatSession,
	writeChatHistory
} from './chat-history';

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
		const valid = { id: 'valid', title: 'Valid', updatedAt: 1, messages: [] };
		storage.getItem.mockReturnValue(JSON.stringify([null, 'legacy', { id: 'broken' }, valid]));

		expect(readChatHistory(scope)).toEqual([valid]);
		expect(storage.getItem).toHaveBeenCalledWith(chatHistoryKey(scope));
	});

	it('isolates history by authenticated user, workspace, and team', () => {
		const otherUser = { ...scope, userId: 'user-b' };
		const otherWorkspace = { ...scope, workspaceId: 'workspace-b' };
		const otherTeam = { ...scope, teamId: 'team-b' };

		expect(new Set([scope, otherUser, otherWorkspace, otherTeam].map(chatHistoryKey))).toHaveProperty('size', 4);
		expect(chatHistoryKey(scope)).not.toBe(CHAT_HISTORY_KEY);
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

		expect(() => writeChatHistory(scope, [])).not.toThrow();
	});
});
