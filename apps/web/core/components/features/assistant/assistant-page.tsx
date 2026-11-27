'use client';

import { useTranslations } from 'next-intl';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { ChatConfigDialog } from '@/core/components/features/chat-panel/components/chat-config-dialog';
import { cn } from '@/core/lib/helpers';
import { ASSISTANT_COLUMN } from './assistant-helpers';
import { useAssistantView } from './hooks/use-assistant-view';
import { AssistantComposer } from './components/assistant-composer';
import { AssistantConversation } from './components/assistant-conversation';
import { AssistantExamples, AssistantWelcome } from './components/assistant-empty-state';
import { AssistantTopBar } from './components/assistant-top-bar';
import { AssistantBodySkeleton, AssistantPageSkeleton } from './components/assistant-page-skeleton';
import { EverSiDisclosure } from './components/ever-si-disclosure';
import { EverSiDockButton } from './components/ever-si-edge-controls';
import { useIsMobile } from '@/core/hooks/common/use-mobile';
import { useHiddenChatwootBubble } from '@/core/components/integration/chatwoot/use-hidden-chatwoot-bubble';

/** Ever SI on a page of its own; elsewhere it opens in the panel beside the page (`ever-si-panel.tsx`). */
function AssistantPageContent() {
	const t = useTranslations();
	// On a phone the support bubble would sit on the composer's send button.
	const isMobile = useIsMobile();
	useHiddenChatwootBubble(isMobile);
	const {
		chat,
		textareaRef,
		configOpen,
		setConfigOpen,
		openConfig,
		handleSaveConfig,
		pickExample,
		userName,
		assistantName,
		hasMessages,
		isEmpty,
		model,
		isReady,
		showsConfigured
	} = useAssistantView();

	const topBar = (
		<AssistantTopBar
			title={chat.currentTitle}
			sessions={chat.history}
			currentSessionId={chat.sessionId}
			hasMessages={hasMessages}
			isConfigured={showsConfigured}
			onNewChat={chat.startNewChat}
			onDeleteConversation={chat.deleteConversation}
			onSelectSession={chat.selectSession}
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
							key={chat.sessionId}
							messages={chat.messages}
							userName={userName}
							assistantName={assistantName}
							isStreaming={chat.isStreaming}
							isWaitingForAnswer={chat.isWaitingForAnswer}
							error={chat.error}
							isConfigured={chat.isConfigured}
							onRetry={chat.retry}
							onOpenConfig={openConfig}
						/>
					)}
					{isEmpty && <AssistantWelcome isConfigured={chat.isConfigured} onOpenConfig={openConfig} />}
					<div className={cn('shrink-0 px-4', hasMessages && 'pt-1 pb-4')}>
						<div className={cn(ASSISTANT_COLUMN, 'flex flex-col gap-2')}>
							<AssistantComposer
								value={chat.input}
								onValueChange={chat.setInput}
								onSubmit={chat.submitInput}
								onStop={chat.stop}
								onOpenConfig={openConfig}
								isBusy={chat.isBusy}
								isConfigured={chat.isConfigured}
								hasUserConfig={chat.hasUserConfig}
								model={model}
								textareaRef={textareaRef}
							/>
							<EverSiDisclosure />
						</div>
					</div>
					{isEmpty && <AssistantExamples onPickExample={pickExample} />}
				</div>
			)}
			{/* The full page is Ever SI at its widest: its far edge leads back to the panel beside a page. */}
			<EverSiDockButton />
			<ChatConfigDialog
				open={configOpen}
				onOpenChange={setConfigOpen}
				config={chat.config}
				onSave={handleSaveConfig}
			/>
		</PageLayout>
	);
}

export const AssistantPage = withAuthentication(AssistantPageContent, {
	displayName: 'Ever SI',
	skeleton: AssistantPageSkeleton
});
