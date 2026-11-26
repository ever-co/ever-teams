'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useAtom, useAtomValue } from 'jotai';
import { activeTeamIdState, activeWorkspaceIdState, userState } from '@/core/stores';
import { useAiConfig } from '@/core/hooks/ai/use-ai-config';
import { useServerAiAvailability } from '@/core/hooks/ai/use-server-ai-availability';
import type { ChatConfig } from '@/core/components/features/chat-panel/components/chat-config-dialog';
import {
	type ChatHistoryMessage,
	type ChatHistoryScope,
	type ChatSession,
	canPersistChatHistory,
	chatHistoryKey,
	createChatSession,
	readChatHistory,
	removeChatSession,
	toChatUiMessages,
	upsertChatSession,
	writeChatHistory
} from '@/core/components/features/chat-panel/chat-history';
import { everSiSessionIdAtom } from '../atoms/ever-si-panel.atom';

const CHAT_API = '/api/chat';

/** The user's own AI settings travel with each request (`sendMessage` and `regenerate` options), not in the transport. */
const CHAT_TRANSPORT = new DefaultChatTransport({ api: CHAT_API });

const NO_SCOPE_KEY = 'no-scope';

function subscribeToNothing() {
	return () => {};
}

function isOnClient() {
	return true;
}

function isOnServer() {
	return false;
}

function createSessionId() {
	return `chat-${Date.now()}`;
}

function toRequestConfig(config: ChatConfig | null) {
	if (!config?.apiKey) {
		return undefined;
	}
	return {
		apiKey: config.apiKey,
		provider: config.provider,
		model: config.model,
		baseURL: config.baseURL
	};
}

function readScopedHistory(scope: ChatHistoryScope | null) {
	if (!scope) {
		return [];
	}
	return readChatHistory(scope);
}

function scopeKeyOf(scope: ChatHistoryScope | null) {
	if (!scope) {
		return NO_SCOPE_KEY;
	}
	return chatHistoryKey(scope);
}

type ScopeState = {
	key: string;
	sessionId: string;
	storedSessions: ChatSession[];
};

/** A fresh conversation, or the one named by `resumeId` when this scope still keeps it. */
function createScopeState(scope: ChatHistoryScope | null, key: string, resumeId: string | null = null): ScopeState {
	const storedSessions = readScopedHistory(scope);
	const resumed = storedSessions.find((session) => session.id === resumeId);
	return {
		key,
		sessionId: resumed?.id ?? createSessionId(),
		storedSessions
	};
}

function messagesOfSession(sessions: ChatSession[], id: string): UIMessage[] | undefined {
	const session = sessions.find((item) => item.id === id);
	if (!session) {
		return undefined;
	}
	return toChatUiMessages(session.messages);
}

function withCurrentSession(storedSessions: ChatSession[], messages: UIMessage[], sessionId: string) {
	if (messages.length === 0) {
		return storedSessions;
	}
	const historyMessages = messages as unknown as ChatHistoryMessage[];
	const session = createChatSession(historyMessages, sessionId);
	return upsertChatSession(storedSessions, session);
}

function findSessionTitle(sessions: ChatSession[], id: string) {
	const session = sessions.find((item) => item.id === id);
	if (!session) {
		return null;
	}
	return session.title;
}

export function useAssistantChat() {
	const user = useAtomValue(userState);
	const workspaceId = useAtomValue(activeWorkspaceIdState);
	const teamId = useAtomValue(activeTeamIdState);
	const userId = user?.id;
	const historyScope = useMemo<ChatHistoryScope | null>(() => {
		if (!userId) {
			return null;
		}
		return { userId, workspaceId, teamId };
	}, [userId, workspaceId, teamId]);
	const scopeKey = scopeKeyOf(historyScope);

	const mounted = useSyncExternalStore(subscribeToNothing, isOnClient, isOnServer);
	const { config, isConfigured: hasUserConfig, saveConfig } = useAiConfig();
	const { hasServerAi } = useServerAiAvailability();
	const isConfigured = hasServerAi || hasUserConfig;

	const [lastSessionId, setLastSessionId] = useAtom(everSiSessionIdAtom);
	const [scopeState, setScopeState] = useState(() => createScopeState(historyScope, scopeKey, lastSessionId));
	const [restoredMessages, setRestoredMessages] = useState(() =>
		messagesOfSession(scopeState.storedSessions, scopeState.sessionId)
	);
	const [input, setInput] = useState('');

	if (scopeState.key !== scopeKey) {
		setScopeState(createScopeState(historyScope, scopeKey));
		setRestoredMessages(undefined);
	}

	const requestConfig = useMemo(() => toRequestConfig(config), [config]);

	const chat = useChat({
		id: scopeState.sessionId,
		messages: restoredMessages,
		transport: CHAT_TRANSPORT
	});
	const { messages, stop, setMessages, sendMessage, regenerate } = chat;

	const submitInput = useCallback(() => {
		const text = input.trim();
		if (!text) {
			return;
		}
		setInput('');
		// From its first message on, this is the conversation the panel and the full page carry on.
		setLastSessionId(scopeState.sessionId);
		void sendMessage({ text }, { body: { config: requestConfig } });
	}, [input, requestConfig, scopeState.sessionId, sendMessage, setLastSessionId]);

	const retry = useCallback(() => {
		void regenerate({ body: { config: requestConfig } });
	}, [regenerate, requestConfig]);

	const sessions = useMemo(
		() => withCurrentSession(scopeState.storedSessions, messages, scopeState.sessionId),
		[messages, scopeState]
	);

	useEffect(() => {
		return () => {
			stop();
		};
	}, [scopeKey, stop]);

	useEffect(() => {
		if (!historyScope) {
			return;
		}
		const canPersist = canPersistChatHistory(scopeState.key, historyScope, messages.length);
		if (!canPersist) {
			return;
		}
		writeChatHistory(historyScope, sessions);
	}, [historyScope, messages.length, scopeState.key, sessions]);

	/** Deletes the open conversation from this browser's history (not only from the screen), then starts a new one. */
	const deleteConversation = useCallback(() => {
		stop();
		const remaining = removeChatSession(sessions, scopeState.sessionId);
		if (historyScope) {
			writeChatHistory(historyScope, remaining);
		}
		setMessages([]);
		setRestoredMessages(undefined);
		setLastSessionId(null);
		setScopeState((current) => ({ ...current, sessionId: createSessionId(), storedSessions: remaining }));
	}, [historyScope, scopeState.sessionId, sessions, setLastSessionId, setMessages, stop]);

	const startNewChat = useCallback(() => {
		stop();
		setRestoredMessages(undefined);
		setLastSessionId(null);
		setScopeState((current) => ({ ...current, sessionId: createSessionId(), storedSessions: sessions }));
	}, [sessions, setLastSessionId, stop]);

	const selectSession = useCallback(
		(session: ChatSession) => {
			stop();
			const sessionMessages = toChatUiMessages(session.messages);
			setRestoredMessages(sessionMessages);
			setLastSessionId(session.id);
			setScopeState((current) => ({ ...current, sessionId: session.id, storedSessions: sessions }));
		},
		[sessions, setLastSessionId, stop]
	);

	const currentTitle = findSessionTitle(sessions, scopeState.sessionId);
	const isStreaming = chat.status === 'streaming';
	const isWaitingForAnswer = chat.status === 'submitted';
	const isBusy = isStreaming || isWaitingForAnswer;

	return {
		...chat,
		input,
		setInput,
		submitInput,
		retry,
		mounted,
		config,
		isConfigured,
		hasUserConfig,
		saveConfig,
		historyScope,
		history: sessions,
		sessionId: scopeState.sessionId,
		currentTitle,
		isStreaming,
		isWaitingForAnswer,
		isBusy,
		deleteConversation,
		startNewChat,
		selectSession
	};
}

export type AssistantChat = ReturnType<typeof useAssistantChat>;
