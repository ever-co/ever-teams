'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bot, ChevronDown, History, Plus, Send, Settings, Stop, Trash } from '@/core/components/icons';
import { Button } from '@/core/components/duplicated-components/_button';
import { controlRecipe } from '@/core/components/common/input';
import { cn } from '@/core/lib/helpers';
import { ScrollArea } from '@/core/components/common/scroll-area';
import { ChatConfigDialog, type ChatConfig } from './chat-config-dialog';
import { ChatMessageItem } from './chat-message-item';
import { useLocale, useTranslations } from 'next-intl';
import type { ChatSession } from '../chat-history';
import { APP_NAME } from '@/core/constants/config/constants';
import { useAssistantChat } from '@/core/components/features/assistant/hooks/use-assistant-chat';

interface ChatViewProps {
	/** Optional context from the current page (prepared for future use) */
	pageContext?: string;
}

export function ChatView(_props: ChatViewProps) {
	const t = useTranslations();
	const locale = useLocale();
	const {
		mounted,
		config,
		isConfigured,
		saveConfig,
		historyScope,
		history,
		messages,
		input,
		setInput,
		submitInput,
		isBusy: isLoading,
		stop,
		error,
		clearConversation,
		startNewChat,
		selectSession
	} = useAssistantChat();

	const [configOpen, setConfigOpen] = useState(false);
	const [historyOpen, setHistoryOpen] = useState(false);

	const handleSaveConfig = useCallback(
		(newConfig: ChatConfig) => {
			saveConfig(newConfig);
			setConfigOpen(false);
		},
		[saveConfig]
	);

	const handleClearChat = clearConversation;

	useEffect(() => {
		setHistoryOpen(false);
	}, [historyScope]);

	const handleNewChat = useCallback(() => {
		startNewChat();
		setHistoryOpen(false);
	}, [startNewChat]);

	const handleSelectHistory = useCallback(
		(session: ChatSession) => {
			selectSession(session);
			setHistoryOpen(false);
		},
		[selectSession]
	);

	const scrollToBottom = useCallback(() => {
		const viewport = document.getElementById('chat-scroll-viewport');
		if (viewport) {
			viewport.scrollTop = viewport.scrollHeight;
		}
	}, []);

	useEffect(() => {
		scrollToBottom();
	}, [messages, scrollToBottom]);

	if (!mounted) return null;

	return (
		<div className="flex h-full flex-col">
			{/* Header */}
			<div className="relative hairline-b border-border px-3 py-2">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="flex size-6 items-center justify-center rounded-md bg-primary/10">
							<Bot className="size-3.5 text-primary-ink" />
						</div>
						<span className="text-sm font-medium text-foreground">{t('chatView.HEADER_TITLE')}</span>
					</div>
					<div className="flex items-center gap-1">
						{messages.length > 0 && (
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								onClick={handleClearChat}
								className="text-muted-foreground"
								title={t('chatView.CLEAR_CONVERSATION')}
							>
								<Trash />
							</Button>
						)}
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							onClick={() => setConfigOpen(true)}
							className={cn(
								isConfigured && 'text-muted-foreground',
								!isConfigured && 'text-destructive-ink'
							)}
							title={t('chatView.CONFIGURATION')}
						>
							<Settings />
						</Button>
					</div>
				</div>
				<div className="mt-2 flex items-center gap-1">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={handleNewChat}
						className="gap-1.5 text-muted-foreground"
					>
						<Plus className="size-3.5" />
						{t('chatView.NEW_CHAT')}
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => setHistoryOpen((open) => !open)}
						className="gap-1.5 text-muted-foreground"
						aria-expanded={historyOpen}
					>
						<History className="size-3.5" />
						{t('chatView.HISTORY')}
					</Button>
				</div>
				{historyOpen ? (
					<div className="absolute left-3 right-3 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-xl bg-popover p-1 hairline-ring ring-border shadow-md shadow-black/6.5">
						{history.length ? (
							history.map((session) => (
								<button
									type="button"
									key={session.id}
									onClick={() => handleSelectHistory(session)}
									className="block w-full rounded-md px-2 py-1.5 text-left outline-none transition-colors hover:bg-foreground/5 focus-visible:bg-foreground/5"
								>
									<span className="block truncate text-sm font-medium text-foreground">
										{session.title}
									</span>
									<span className="mt-0.5 block text-xs text-muted-foreground">
										{new Date(session.updatedAt).toLocaleString(locale)}
									</span>
								</button>
							))
						) : (
							<p className="px-3 py-4 text-center text-xs text-muted-foreground">
								{t('chatView.NO_CONVERSATIONS')}
							</p>
						)}
					</div>
				) : null}
			</div>

			{/* Messages */}
			<ScrollArea className="flex-1">
				<div id="chat-scroll-viewport" className="flex h-full flex-col overflow-y-auto">
					{messages.length === 0 ? (
						<div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
							<div className="flex size-10 items-center justify-center rounded-lg bg-foreground/5">
								<Bot className="size-5 text-muted-foreground" />
							</div>
							<div>
								<p className="text-sm font-semibold text-foreground">
									{t('chatView.ASSISTANT_NAME', { appName: APP_NAME })}
								</p>
								<p className="mt-1 text-sm text-balance text-muted-foreground">
									{isConfigured ? t('chatView.EMPTY_CONFIGURED') : t('chatView.EMPTY_NOT_CONFIGURED')}
								</p>
							</div>
							{!isConfigured && (
								<Button
									type="button"
									size="default"
									onClick={() => setConfigOpen(true)}
									className="mt-1"
								>
									{t('chatView.CONFIGURE_BUTTON')}
								</Button>
							)}
						</div>
					) : (
						<div className="flex flex-col gap-1 p-3">
							{messages.map((message) => (
								<ChatMessageItem key={message.id} message={message} />
							))}
							{isLoading && (
								<div className="flex items-center gap-2 px-3 py-2">
									<div className="flex gap-1">
										<span className="size-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
										<span className="size-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
										<span className="size-1.5 animate-pulse rounded-full bg-muted-foreground" />
									</div>
								</div>
							)}
							{error && (
								<div className="mx-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive-ink">
									{error.message || t('chatView.ERROR_FALLBACK')}
								</div>
							)}
						</div>
					)}
				</div>
			</ScrollArea>

			{/* Scroll to bottom button */}
			{messages.length > 3 && (
				<div className="flex justify-center">
					<button
						type="button"
						onClick={scrollToBottom}
						className="absolute bottom-16 z-10 flex size-8 items-center justify-center rounded-full hairline-border border-transparent bg-card text-muted-foreground shadow-md shadow-black/10 hairline-ring ring-foreground/10 outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 dark:ring-foreground/15"
					>
						<ChevronDown className="size-4" />
					</button>
				</div>
			)}

			{/* Input */}
			<div className="hairline-t border-border p-3">
				<form
					onSubmit={(event) => {
						event.preventDefault();
						submitInput();
					}}
					className="flex items-end gap-2"
				>
					<textarea
						value={input}
						onChange={(event) => setInput(event.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
								e.preventDefault();
								if (input.trim() && isConfigured) {
									submitInput();
								}
							}
						}}
						placeholder={
							isConfigured
								? t('chatView.INPUT_PLACEHOLDER_READY')
								: t('chatView.INPUT_PLACEHOLDER_NO_KEY')
						}
						disabled={!isConfigured}
						rows={1}
						className={cn(controlRecipe, 'flex-1 resize-none px-3 py-1.5', 'max-h-32 min-h-8')}
						style={{ height: 'auto' }}
						ref={(el) => {
							if (el) {
								el.style.height = 'auto';
								el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
							}
						}}
					/>
					{isLoading ? (
						<Button
							type="button"
							variant="destructive"
							size="icon"
							onClick={stop}
							title={t('chatView.STOP')}
						>
							<Stop />
						</Button>
					) : (
						<Button
							type="submit"
							size="icon"
							disabled={!input.trim() || !isConfigured}
							title={t('chatView.SEND')}
						>
							<Send />
						</Button>
					)}
				</form>
			</div>

			{/* Config Dialog */}
			<ChatConfigDialog
				open={configOpen}
				onOpenChange={setConfigOpen}
				config={config}
				onSave={handleSaveConfig}
			/>
		</div>
	);
}
