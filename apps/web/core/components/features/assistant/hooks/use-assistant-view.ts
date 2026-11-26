'use client';

import { useCallback, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import type { ChatConfig } from '@/core/components/features/chat-panel/components/chat-config-dialog';
import { useServerAiAvailability } from '@/core/hooks/ai/use-server-ai-availability';
import { userState } from '@/core/stores';
import { displayNameOf } from '../assistant-helpers';
import { useAssistantChat } from './use-assistant-chat';

function modelOf(config: ChatConfig | null) {
	if (!config) {
		return null;
	}
	return config.model;
}

/**
 * Everything the two Ever SI surfaces, the `/assistant` page and the panel beside a page, render from: the chat,
 * the configuration dialog's state, the example picker and the names shown on the messages.
 */
export function useAssistantView() {
	const t = useTranslations();
	const user = useAtomValue(userState);
	const chat = useAssistantChat();
	const { isChecking: isCheckingServerAi } = useServerAiAvailability();
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const [configOpen, setConfigOpen] = useState(false);
	const { saveConfig, setInput } = chat;

	const openConfig = useCallback(() => setConfigOpen(true), []);

	const handleSaveConfig = useCallback(
		(nextConfig: ChatConfig) => {
			saveConfig(nextConfig);
			setConfigOpen(false);
		},
		[saveConfig]
	);

	const pickExample = useCallback(
		(prompt: string) => {
			setInput(prompt);
			textareaRef.current?.focus();
		},
		[setInput]
	);

	const hasMessages = chat.messages.length > 0;
	const isWaitingForServerAi = isCheckingServerAi && !chat.hasUserConfig;

	return {
		chat,
		textareaRef,
		configOpen,
		setConfigOpen,
		openConfig,
		handleSaveConfig,
		pickExample,
		userName: displayNameOf(user, t('chatView.YOU')),
		assistantName: t('chatView.ASSISTANT_NAME'),
		hasMessages,
		isEmpty: !hasMessages,
		model: modelOf(chat.config),
		isReady: chat.mounted && !isWaitingForServerAi,
		showsConfigured: chat.isConfigured || isWaitingForServerAi
	};
}
