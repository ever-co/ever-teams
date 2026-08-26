import { ChatSession, createChatSession, upsertChatSession } from './chat-history';

describe('chat history', () => {
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
});
