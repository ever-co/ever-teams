import {
	CHAT_HISTORY_KEY,
	ChatSession,
	createChatSession,
	readChatHistory,
	upsertChatSession,
	writeChatHistory
} from './chat-history';

describe('chat history', () => {
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

		expect(readChatHistory()).toEqual([valid]);
		expect(storage.getItem).toHaveBeenCalledWith(CHAT_HISTORY_KEY);
	});

	it('keeps chat usable when browser-local history cannot be written', () => {
		storage.setItem.mockImplementation(() => {
			throw new DOMException('Quota exceeded', 'QuotaExceededError');
		});

		expect(() => writeChatHistory([])).not.toThrow();
	});
});
