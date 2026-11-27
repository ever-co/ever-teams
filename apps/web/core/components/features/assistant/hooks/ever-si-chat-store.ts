import { Chat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import {
	type ChatHistoryMessage,
	type ChatHistoryScope,
	type ChatSession,
	chatHistoryKey,
	readChatHistory,
	toChatUiMessages,
	withChatSessionMessages,
	writeChatHistory
} from '@/core/components/features/chat-panel/chat-history';
import { isChatScopeLive, onLiveChatScopeChange } from '@/core/components/features/chat-panel/chat-scope';

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

/**
 * What the person has typed and not sent, per history scope, outside React for the same reason: each view has a
 * composer of its own, and collapsing the panel, widening it to the full page or crossing the phone breakpoint
 * unmounts the one being typed in. Kept for the visit only, as the open conversation is.
 */
const drafts = new Map<string, string>();

/** The unsent text of this scope, for the composer of the view that mounts next. */
export function readEverSiDraft(scopeKey: string) {
	return drafts.get(scopeKey) ?? '';
}

/** The composer's text as it is typed; an empty composer keeps nothing. */
export function writeEverSiDraft(scopeKey: string, text: string) {
	if (text) {
		drafts.set(scopeKey, text);
		return;
	}
	drafts.delete(scopeKey);
}

/** Unique even for two conversations started in the same millisecond (New chat right after a first message). */
function createSessionId() {
	const [random] = crypto.getRandomValues(new Uint32Array(1));
	return `chat-${Date.now()}-${random.toString(36)}`;
}

/**
 * An answer that finishes while no view shows it (the panel closed, say) still lands in the history, unless its
 * scope ended meanwhile: another workspace or team, another account, or a sign-out that cleared the history.
 */
function keepFinishedConversation(scope: ChatHistoryScope | null, id: string, messages: UIMessage[]) {
	if (!scope || messages.length === 0) {
		return;
	}
	if (!isChatScopeLive(chatHistoryKey(scope))) {
		return;
	}
	const historyMessages = messages as unknown as ChatHistoryMessage[];
	writeChatHistory(scope, withChatSessionMessages(readChatHistory(scope), id, historyMessages));
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

/**
 * The person moved to another workspace or team, signed in as someone else or signed out: those answers stop, and
 * what was typed there and not sent is forgotten with them, so it never waits for whoever comes next.
 */
function closeEverSiChatsOutside(liveKey: string | null) {
	for (const [key, chat] of openChats) {
		if (key === liveKey) {
			continue;
		}
		openChats.delete(key);
		void chat.stop();
	}
	for (const key of drafts.keys()) {
		if (key !== liveKey) {
			drafts.delete(key);
		}
	}
}

// The shell reports every change of scope, whether an Ever SI view is mounted or not (the panel may be closed while
// an answer runs). Registered once, when the chat first loads; before that there is no answer to stop.
onLiveChatScopeChange(closeEverSiChatsOutside);
