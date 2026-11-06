'use client';

import { useCallback, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { ChatConfigDialog, type ChatConfig } from '@/core/components/features/chat-panel/components/chat-config-dialog';
import { APP_NAME } from '@/core/constants/config/constants';
import { userState } from '@/core/stores';
import { cn } from '@/core/lib/helpers';
import { ASSISTANT_COLUMN, displayNameOf } from './assistant-helpers';
import { useAssistantChat } from './hooks/use-assistant-chat';
import { AssistantComposer } from './components/assistant-composer';
import { AssistantConversation } from './components/assistant-conversation';
import { AssistantExamples, AssistantWelcome } from './components/assistant-empty-state';
import { AssistantTopBar } from './components/assistant-top-bar';
import { AssistantBodySkeleton, AssistantPageSkeleton } from './components/assistant-page-skeleton';
import { useServerAiAvailability } from '@/core/hooks/ai/use-server-ai-availability';

function modelOf(config: ChatConfig | null) {
	if (!config) {
		return null;
	}
	return config.model;
}

function AssistantPageContent() {
	const t = useTranslations();
	const user = useAtomValue(userState);
	const {
		mounted,
		config,
		isConfigured,
		saveConfig,
		messages,
		input,
		setInput,
		submitInput,
		retry,
		stop,
		error,
		hasUserConfig,
		history,
		sessionId,
		currentTitle,
		isBusy,
		isStreaming,
		isWaitingForAnswer,
		startNewChat,
		selectSession,
		clearConversation
	} = useAssistantChat();
	const { isChecking: isCheckingServerAi } = useServerAiAvailability();
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const [configOpen, setConfigOpen] = useState(false);

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

	const youLabel = t('chatView.YOU');
	const userName = displayNameOf(user, youLabel);
	const assistantName = t('chatView.ASSISTANT_NAME', { appName: APP_NAME });
	const hasMessages = messages.length > 0;
	const isEmpty = !hasMessages;
	const model = modelOf(config);
	const isWaitingForServerAi = isCheckingServerAi && !hasUserConfig;
	const isReady = mounted && !isWaitingForServerAi;
	const showsConfigured = isConfigured || isWaitingForServerAi;

	const topBar = (
		<AssistantTopBar
			title={currentTitle}
			sessions={history}
			currentSessionId={sessionId}
			hasMessages={hasMessages}
			isConfigured={showsConfigured}
			onNewChat={startNewChat}
			onClearConversation={clearConversation}
			onSelectSession={selectSession}
			onOpenConfig={openConfig}
		/>
	);

	return (
		<PageLayout title={t('chatView.ASSISTANT')} breadcrumb={topBar} className="flex-1 p-0">
			{!isReady && <AssistantBodySkeleton onPickExample={pickExample} />}
			{isReady && (
				<div className={cn('absolute inset-0 flex flex-col', isEmpty && 'overflow-y-auto custom-scrollbar')}>
					{hasMessages && (
						<AssistantConversation
							key={sessionId}
							messages={messages}
							userName={userName}
							assistantName={assistantName}
							isStreaming={isStreaming}
							isWaitingForAnswer={isWaitingForAnswer}
							error={error}
							isConfigured={isConfigured}
							onRetry={retry}
							onOpenConfig={openConfig}
						/>
					)}
					{isEmpty && <AssistantWelcome isConfigured={isConfigured} onOpenConfig={openConfig} />}
					<div className={cn('shrink-0 px-4', hasMessages && 'pt-1 pb-4')}>
						<div className={ASSISTANT_COLUMN}>
							<AssistantComposer
								value={input}
								onValueChange={setInput}
								onSubmit={submitInput}
								onStop={stop}
								onOpenConfig={openConfig}
								isBusy={isBusy}
								isConfigured={isConfigured}
								hasUserConfig={hasUserConfig}
								model={model}
								textareaRef={textareaRef}
							/>
						</div>
					</div>
					{isEmpty && <AssistantExamples onPickExample={pickExample} />}
				</div>
			)}
			<ChatConfigDialog
				open={configOpen}
				onOpenChange={setConfigOpen}
				config={config}
				onSave={handleSaveConfig}
			/>
		</PageLayout>
	);
}

export const AssistantPage = withAuthentication(AssistantPageContent, {
	displayName: 'Assistant',
	skeleton: AssistantPageSkeleton
});
