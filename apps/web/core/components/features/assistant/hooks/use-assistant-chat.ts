'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { type Chat, useChat } from '@ai-sdk/react';
import type { UIMessage } from 'ai';
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
	readChatHistory,
	removeChatSession,
	withChatSessionMessages,
	writeChatHistory
} from '@/core/components/features/chat-panel/chat-history';
import { createEverSiChat, openEverSiChat, replaceEverSiChat } from './ever-si-chat-store';

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
	/** The scope's open conversation, shared with the other Ever SI views (`ever-si-chat-store.ts`). */
	chat: Chat<UIMessage>;
	storedSessions: ChatSession[];
};

function createScopeState(scope: ChatHistoryScope | null, key: string): ScopeState {
	return {
		key,
		chat: openEverSiChat(key, scope),
		storedSessions: readScopedHistory(scope)
	};
}

function withCurrentSession(storedSessions: ChatSession[], messages: UIMessage[], sessionId: string) {
	const historyMessages = messages as unknown as ChatHistoryMessage[];
	return withChatSessionMessages(storedSessions, sessionId, historyMessages);
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
	const [input, setInput] = useState('');

	if (scopeState.key !== scopeKey) {
		setScopeState(createScopeState(historyScope, scopeKey));
	}

	const requestConfig = useMemo(() => toRequestConfig(config), [config]);

	// An instance from outside: useChat neither recreates it nor stops it when this view unmounts.
	const chat = useChat({ chat: scopeState.chat });
	const { messages, sendMessage, regenerate } = chat;
	const sessionId = scopeState.chat.id;

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
		() => withCurrentSession(scopeState.storedSessions, messages, sessionId),
		[messages, scopeState.storedSessions, sessionId]
	);

	// Unmounting a view does not stop the answer: the panel, the phone sheet and the full page share it. A change of
	// workspace, team or account does, from the shell (useEverSiScopeWatcher), even with no view mounted.

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
	/** Opens `next` in every view of this scope, stopping the answer still running in the conversation it replaces. */
	const switchTo = useCallback(
		(next: Chat<UIMessage>, storedSessions: ChatSession[]) => {
			replaceEverSiChat(scopeKey, next);
			setScopeState((current) => ({ ...current, chat: next, storedSessions }));
		},
		[scopeKey]
	);

	/** Deletes the open conversation from this browser's history (not only from the screen), then starts a new one. */
	const deleteConversation = useCallback(() => {
		const remaining = removeChatSession(sessions, sessionId);
		if (historyScope) {
			writeChatHistory(historyScope, remaining);
		}
		switchTo(createEverSiChat(historyScope), remaining);
	}, [historyScope, sessionId, sessions, switchTo]);

	const startNewChat = useCallback(() => {
		switchTo(createEverSiChat(historyScope), sessions);
	}, [historyScope, sessions, switchTo]);

	const selectSession = useCallback(
		(session: ChatSession) => {
			switchTo(createEverSiChat(historyScope, session), sessions);
		},
		[historyScope, sessions, switchTo]
	);

	const currentTitle = findSessionTitle(sessions, sessionId);
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
		sessionId,
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
