export const CHAT_HISTORY_KEY = 'ever-teams-chat-history-v1';
export const CHAT_HISTORY_LIMIT = 50;

export type ChatHistoryMessage = {
	id: string;
	role: string;
	content?: string;
	parts?: Array<{ type?: string; text?: string; [key: string]: unknown }>;
};

export type ChatSession = {
	id: string;
	title: string;
	updatedAt: number;
	messages: ChatHistoryMessage[];
};

function conversationTitle(messages: ChatHistoryMessage[]) {
	const firstUser = messages.find((message) => message.role === 'user');
	const firstUserMessage = (
		firstUser?.content ||
		firstUser?.parts?.find((part) => part.type === 'text')?.text ||
		''
	).trim();
	if (!firstUserMessage) return 'New conversation';
	return firstUserMessage.length > 52 ? `${firstUserMessage.slice(0, 49)}...` : firstUserMessage;
}

export function createChatSession(messages: ChatHistoryMessage[], id = `chat-${Date.now()}`): ChatSession {
	return {
		id,
		title: conversationTitle(messages),
		updatedAt: Date.now(),
		messages
	};
}

export function upsertChatSession(sessions: ChatSession[], session: ChatSession): ChatSession[] {
	return [session, ...sessions.filter((item) => item.id !== session.id)]
		.sort((left, right) => right.updatedAt - left.updatedAt)
		.slice(0, CHAT_HISTORY_LIMIT);
}

export function readChatHistory(): ChatSession[] {
	if (typeof window === 'undefined') return [];
	try {
		const value = JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || '[]');
		return Array.isArray(value) ? value.slice(0, CHAT_HISTORY_LIMIT) : [];
	} catch {
		return [];
	}
}

export function writeChatHistory(sessions: ChatSession[]) {
	if (typeof window === 'undefined') return;
	localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(sessions.slice(0, CHAT_HISTORY_LIMIT)));
}
