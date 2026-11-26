import { Chat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import {
	type ChatHistoryMessage,
	type ChatHistoryScope,
	type ChatSession,
	createChatSession,
	readChatHistory,
	toChatUiMessages,
	upsertChatSession,
	writeChatHistory
} from '@/core/components/features/chat-panel/chat-history';

const CHAT_API = '/api/chat';

/** The user's own AI settings travel with each request (`sendMessage` and `regenerate` options), not in the transport. */
const CHAT_TRANSPORT = new DefaultChatTransport({ api: CHAT_API });

/**
 * The open conversation of each history scope (user, workspace, team), outside React. Ever SI shows it in three
 * views that never live at the same time: the panel, the phone sheet and the `/assistant` page. Each mounts its own
 * `useChat`, and they all share this one `Chat`, so moving between them, resizing across the phone breakpoint or
 * closing the panel never cuts a running answer short. It lives in the chat's lazy chunk, not in the first page load.
 */
const openChats = new Map<string, Chat<UIMessage>>();

/** Unique even for two conversations started in the same millisecond (New chat right after a first message). */
function createSessionId() {
	const [random] = crypto.getRandomValues(new Uint32Array(1));
	return `chat-${Date.now()}-${random.toString(36)}`;
}

/** An answer that finishes while no view shows it (the panel closed, say) still lands in the history. */
function keepFinishedConversation(scope: ChatHistoryScope | null, id: string, messages: UIMessage[]) {
	if (!scope || messages.length === 0) {
		return;
	}
	const session = createChatSession(messages as unknown as ChatHistoryMessage[], id);
	writeChatHistory(scope, upsertChatSession(readChatHistory(scope), session));
}

/** A new conversation, or a saved one to carry on. */
export function createEverSiChat(scope: ChatHistoryScope | null, session?: ChatSession) {
	const id = session?.id ?? createSessionId();
	let messages: UIMessage[] | undefined;
	if (session) {
		messages = toChatUiMessages(session.messages);
	}
	return new Chat<UIMessage>({
		id,
		messages,
		transport: CHAT_TRANSPORT,
		onFinish: (result) => {
			// A stopped answer was already saved by the view that stopped it, and a deleted conversation must stay
			// deleted: only answers that ran to their end are written here.
			if (result.isAbort) {
				return;
			}
			keepFinishedConversation(scope, id, result.messages);
		}
	});
}

/** The conversation open in this scope: the same instance for every view, created the first time one asks. */
export function openEverSiChat(scopeKey: string, scope: ChatHistoryScope | null) {
	const open = openChats.get(scopeKey);
	if (open) {
		return open;
	}
	const chat = createEverSiChat(scope);
	openChats.set(scopeKey, chat);
	return chat;
}

/** New chat, a conversation from the history, or a deleted one: the answer still running in the old one stops. */
export function replaceEverSiChat(scopeKey: string, chat: Chat<UIMessage>) {
	const previous = openChats.get(scopeKey);
	openChats.set(scopeKey, chat);
	if (previous && previous !== chat) {
		void previous.stop();
	}
}

/** The person moved to another workspace or team, or signed in as someone else: the other scopes' answers stop. */
export function closeEverSiChatsOutside(scopeKey: string) {
	for (const [key, chat] of openChats) {
		if (key === scopeKey) {
			continue;
		}
		openChats.delete(key);
		void chat.stop();
	}
}
