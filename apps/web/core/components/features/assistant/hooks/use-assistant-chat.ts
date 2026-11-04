'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useAtomValue } from 'jotai';
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
	toChatUiMessages,
	upsertChatSession,
	writeChatHistory
} from '@/core/components/features/chat-panel/chat-history';

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

function createScopeState(scope: ChatHistoryScope | null, key: string): ScopeState {
	return {
		key,
		sessionId: createSessionId(),
		storedSessions: readScopedHistory(scope)
	};
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

	const [scopeState, setScopeState] = useState(() => createScopeState(historyScope, scopeKey));
	const [restoredMessages, setRestoredMessages] = useState<UIMessage[] | undefined>(undefined);
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
		void sendMessage({ text }, { body: { config: requestConfig } });
	}, [input, requestConfig, sendMessage]);

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

	const clearConversation = useCallback(() => {
		stop();
		setMessages([]);
	}, [setMessages, stop]);

	const startNewChat = useCallback(() => {
		stop();
		setRestoredMessages(undefined);
		setScopeState((current) => ({ ...current, sessionId: createSessionId(), storedSessions: sessions }));
	}, [sessions, stop]);

	const selectSession = useCallback(
		(session: ChatSession) => {
			stop();
			const sessionMessages = toChatUiMessages(session.messages);
			setRestoredMessages(sessionMessages);
			setScopeState((current) => ({ ...current, sessionId: session.id, storedSessions: sessions }));
		},
		[sessions, stop]
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
		clearConversation,
		startNewChat,
		selectSession
	};
}

export type AssistantChat = ReturnType<typeof useAssistantChat>;
