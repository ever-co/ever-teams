export const CHAT_HISTORY_KEY = 'ever-teams-chat-history-v1';
export const CHAT_HISTORY_LIMIT = 50;

export type ChatHistoryScope = {
	userId: string;
	workspaceId?: string | null;
	teamId?: string | null;
};

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

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isChatHistoryMessage(value: unknown): value is ChatHistoryMessage {
	return isRecord(value) && typeof value.id === 'string' && typeof value.role === 'string';
}

function isChatSession(value: unknown): value is ChatSession {
	return (
		isRecord(value) &&
		typeof value.id === 'string' &&
		typeof value.title === 'string' &&
		typeof value.updatedAt === 'number' &&
		Number.isFinite(value.updatedAt) &&
		Array.isArray(value.messages) &&
		value.messages.every(isChatHistoryMessage)
	);
}

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

type TextPart = { type: 'text'; text: string };

function isTextPart(part: { type?: string; text?: string }): part is TextPart {
	const isText = part.type === 'text';
	const hasText = typeof part.text === 'string';
	return isText && hasText;
}

/** The text a message shows, from its parts (AI SDK 5 and later) or the `content` of history saved before. */
export function textOfChatMessage(message: Pick<ChatHistoryMessage, 'content' | 'parts'>) {
	const textParts = (message.parts ?? []).filter(isTextPart);
	if (textParts.length > 0) {
		return textParts.map((part) => part.text).join('');
	}
	return message.content ?? '';
}

type ChatUiMessage = { id: string; role: 'user' | 'assistant'; parts: TextPart[] };

function isConversationRole(role: string): role is ChatUiMessage['role'] {
	const isUser = role === 'user';
	const isAssistant = role === 'assistant';
	return isUser || isAssistant;
}

/**
 * Saved conversations as the chat reads them now: one text part per message, whatever the format they were saved
 * in. Other roles and empty messages, which the chat never shows, are left out.
 */
export function toChatUiMessages(messages: ChatHistoryMessage[]): ChatUiMessage[] {
	const converted: ChatUiMessage[] = [];
	for (const message of messages) {
		if (!isConversationRole(message.role)) {
			continue;
		}
		const text = textOfChatMessage(message);
		if (!text) {
			continue;
		}
		converted.push({ id: message.id, role: message.role, parts: [{ type: 'text', text }] });
	}
	return converted;
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

function scopeSegment(value?: string | null) {
	return encodeURIComponent(value || 'none');
}

export function chatHistoryKey(scope: ChatHistoryScope) {
	return `${CHAT_HISTORY_KEY}:${scopeSegment(scope.userId)}:${scopeSegment(scope.workspaceId)}:${scopeSegment(scope.teamId)}`;
}

export function canPersistChatHistory(
	loadedScopeKey: string | null,
	scope: ChatHistoryScope | null,
	messageCount: number
) {
	return Boolean(scope && messageCount > 0 && loadedScopeKey === chatHistoryKey(scope));
}

export function readChatHistory(scope: ChatHistoryScope): ChatSession[] {
	if (typeof window === 'undefined') return [];
	try {
		// Never expose history written by the former origin-wide key to another signed-in account.
		localStorage.removeItem(CHAT_HISTORY_KEY);
		const value: unknown = JSON.parse(localStorage.getItem(chatHistoryKey(scope)) || '[]');
		return Array.isArray(value) ? value.filter(isChatSession).slice(0, CHAT_HISTORY_LIMIT) : [];
	} catch {
		return [];
	}
}

export function writeChatHistory(scope: ChatHistoryScope, sessions: ChatSession[]) {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(chatHistoryKey(scope), JSON.stringify(sessions.slice(0, CHAT_HISTORY_LIMIT)));
	} catch {
		// Browser storage can be unavailable or full; chat must remain usable without persistence.
	}
}

export function clearChatHistoryForUser(userId?: string | null) {
	if (typeof window === 'undefined') return;
	try {
		const userPrefix = userId ? `${CHAT_HISTORY_KEY}:${scopeSegment(userId)}:` : null;
		const keysToRemove: string[] = [];
		for (let index = 0; index < localStorage.length; index += 1) {
			const key = localStorage.key(index);
			if (key === CHAT_HISTORY_KEY || (key && userPrefix && key.startsWith(userPrefix))) {
				keysToRemove.push(key);
			}
		}
		keysToRemove.forEach((key) => localStorage.removeItem(key));
	} catch {
		// Logout and account switching must still work when browser storage is unavailable.
	}
}
