'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';
import { ChatConfigDialog } from '@/core/components/features/chat-panel/components/chat-config-dialog';
import { Compose, Expand, X } from '@/core/components/icons';
import { EVER_SI_PATH } from '../atoms/ever-si-panel.atom';
import { useAssistantView } from '../hooks/use-assistant-view';
import { AssistantComposer } from './assistant-composer';
import { AssistantConversation } from './assistant-conversation';
import { AssistantExamples, AssistantWelcome } from './assistant-empty-state';
import { AssistantComposerSkeleton } from './assistant-page-skeleton';
import { AssistantHistoryMenu, AssistantTopBarAction } from './assistant-top-bar';
import { EverSiDisclosure } from './ever-si-disclosure';

type EverSiPanelBodyProps = {
	/** The panel's name, as a heading on desktop or as the sheet's title on phones. */
	title: ReactNode;
	onClose: () => void;
	/** Runs as the person follows the link to the full page; what it does to the panel is the surface's choice. */
	onOpenFullPage: () => void;
};

/** The full page holds the same conversation: the page takes it over, and the panel is not shown there. */
function FullPageLink({ onNavigate }: Readonly<{ onNavigate: () => void }>) {
	const t = useTranslations();
	const label = t('chatView.OPEN_FULL_PAGE');
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button asChild variant="ghost" size="icon-sm" className="text-muted-foreground">
					<Link href={EVER_SI_PATH} onClick={onNavigate} aria-label={label}>
						<Expand aria-hidden="true" />
					</Link>
				</Button>
			</TooltipTrigger>
			<TooltipContent side="bottom">{label}</TooltipContent>
		</Tooltip>
	);
}

/**
 * Ever SI inside the panel: the conversation of the `/assistant` page (`useAssistantView`) under a compact header,
 * the composer at the foot and the disclosure line under it.
 */
export function EverSiPanelBody({ title, onClose, onOpenFullPage }: Readonly<EverSiPanelBodyProps>) {
	const t = useTranslations();
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
		isReady
	} = useAssistantView();
	const newChatLabel = t('chatView.NEW_CHAT');
	const shownTitle = chat.currentTitle ?? newChatLabel;

	return (
		<>
			<header className="flex h-12 shrink-0 items-center gap-1 hairline-b border-border ps-4 pe-2">
				<div className="min-w-0 flex-1">{title}</div>
				<AssistantHistoryMenu
					variant="icon"
					title={shownTitle}
					sessions={chat.history}
					currentSessionId={chat.sessionId}
					hasMessages={hasMessages}
					onNewChat={chat.startNewChat}
					onDeleteConversation={chat.deleteConversation}
					onSelectSession={chat.selectSession}
				/>
				<AssistantTopBarAction label={newChatLabel} onClick={chat.startNewChat}>
					<Compose />
				</AssistantTopBarAction>
				<FullPageLink onNavigate={onOpenFullPage} />
				<AssistantTopBarAction label={t('chatView.COLLAPSE_ASSISTANT')} onClick={onClose}>
					<X />
				</AssistantTopBarAction>
			</header>

			<div className="relative flex min-h-0 flex-1 flex-col">
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
				{isEmpty && (
					<div className="flex min-h-0 flex-1 flex-col overflow-y-auto custom-scrollbar">
						{/* No "add a key" notice until the deployment's own AI availability is known. */}
						<AssistantWelcome
							surface="panel"
							isConfigured={!isReady || chat.isConfigured}
							onOpenConfig={openConfig}
						/>
						<AssistantExamples surface="panel" onPickExample={pickExample} />
					</div>
				)}
				<div className="shrink-0 px-3 pt-1">
					{!isReady && <AssistantComposerSkeleton />}
					{isReady && (
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
					)}
				</div>
				<EverSiDisclosure className="px-4 pt-2 pb-3" />
			</div>

			<ChatConfigDialog
				open={configOpen}
				onOpenChange={setConfigOpen}
				config={chat.config}
				onSave={handleSaveConfig}
			/>
		</>
	);
}
