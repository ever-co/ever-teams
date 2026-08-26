'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Bot, Settings, Trash2, Send, Square, ChevronDown, History, Plus } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { cn } from '@/core/lib/helpers';
import { ScrollArea } from '@/core/components/common/scroll-area';
import { ChatConfigDialog, type ChatConfig } from './chat-config-dialog';
import { ChatMessageItem } from './chat-message-item';
import { useLocale, useTranslations } from 'next-intl';
import {
	type ChatHistoryMessage,
	type ChatHistoryScope,
	type ChatSession,
	canPersistChatHistory,
	chatHistoryKey,
	createChatSession,
	readChatHistory,
	upsertChatSession,
	writeChatHistory
} from '../chat-history';
import { activeTeamIdState, activeWorkspaceIdState, userState } from '@/core/stores';
import { useAtomValue } from 'jotai';

const CHAT_CONFIG_KEY = 'ever-teams-chat-config';

interface ChatViewProps {
	/** Optional context from the current page (prepared for future use) */
	pageContext?: string;
}

function getStoredConfig(): ChatConfig | null {
	if (typeof window === 'undefined') return null;
	try {
		const raw = localStorage.getItem(CHAT_CONFIG_KEY);
		return raw ? (JSON.parse(raw) as ChatConfig) : null;
	} catch {
		return null;
	}
}

function storeConfig(config: ChatConfig) {
	localStorage.setItem(CHAT_CONFIG_KEY, JSON.stringify(config));
}

export function ChatView({ pageContext }: ChatViewProps) {
	const t = useTranslations();
	const locale = useLocale();
	const user = useAtomValue(userState);
	const workspaceId = useAtomValue(activeWorkspaceIdState);
	const teamId = useAtomValue(activeTeamIdState);
	const historyScope = useMemo<ChatHistoryScope | null>(
		() => (user?.id ? { userId: user.id, workspaceId, teamId } : null),
		[user?.id, workspaceId, teamId]
	);

	const [config, setConfig] = useState<ChatConfig | null>(null);
	const [configOpen, setConfigOpen] = useState(false);
	const [mounted, setMounted] = useState(false);
	const [historyOpen, setHistoryOpen] = useState(false);
	const [history, setHistory] = useState<ChatSession[]>([]);
	const [sessionId, setSessionId] = useState(() => `chat-${Date.now()}`);
	const [loadedHistoryScopeKey, setLoadedHistoryScopeKey] = useState<string | null>(null);

	useEffect(() => {
		setMounted(true);
		const stored = getStoredConfig();
		if (stored) {
			setConfig(stored);
		}
	}, []);

	const { messages, input, handleInputChange, handleSubmit, isLoading, stop, setMessages, error } = useChat({
		api: '/api/chat',
		body: {
			config: config
				? {
						apiKey: config.apiKey,
						provider: config.provider,
						model: config.model,
						baseURL: config.baseURL
					}
				: undefined
		}
	});

	const handleSaveConfig = useCallback(
		(newConfig: ChatConfig) => {
			setConfig(newConfig);
			storeConfig(newConfig);
			setConfigOpen(false);
		},
		[setConfig]
	);

	const handleClearChat = useCallback(() => {
		stop();
		setMessages([]);
	}, [setMessages, stop]);

	useEffect(() => {
		if (!mounted) return;
		setLoadedHistoryScopeKey(null);
		stop();
		setMessages([]);
		setSessionId(`chat-${Date.now()}`);
		setHistory(historyScope ? readChatHistory(historyScope) : []);
		setHistoryOpen(false);
	}, [historyScope, mounted, setMessages, stop]);

	useEffect(() => {
		if (!mounted || !historyScope || loadedHistoryScopeKey !== null || messages.length !== 0) return;
		setLoadedHistoryScopeKey(chatHistoryKey(historyScope));
	}, [historyScope, loadedHistoryScopeKey, messages.length, mounted]);

	const handleNewChat = useCallback(() => {
		stop();
		setMessages([]);
		setSessionId(`chat-${Date.now()}`);
		setHistoryOpen(false);
	}, [setMessages, stop]);

	const handleSelectHistory = useCallback(
		(session: ChatSession) => {
			stop();
			setMessages(session.messages as Parameters<typeof setMessages>[0]);
			setSessionId(session.id);
			setHistoryOpen(false);
		},
		[setMessages, stop]
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

	useEffect(() => {
		if (!historyScope || !canPersistChatHistory(loadedHistoryScopeKey, historyScope, messages.length)) return;
		const session = createChatSession(messages as unknown as ChatHistoryMessage[], sessionId);
		setHistory((current) => {
			const next = upsertChatSession(current, session);
			writeChatHistory(historyScope, next);
			return next;
		});
	}, [historyScope, loadedHistoryScopeKey, messages, sessionId]);

	if (!mounted) return null;

	const isConfigured = !!config?.apiKey;

	return (
		<div className="flex h-full flex-col dark:bg-dark-high">
			{/* Header */}
			<div className="relative border-b border-border px-3 py-2">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
							<Bot className="h-4 w-4 text-primary dark:text-primary-light" />
						</div>
						<span className="text-sm font-semibold text-foreground">{t('chatView.HEADER_TITLE')}</span>
					</div>
					<div className="flex items-center gap-1">
						{messages.length > 0 && (
							<button
								type="button"
								onClick={handleClearChat}
								className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
								title={t('chatView.CLEAR_CONVERSATION')}
							>
								<Trash2 className="h-3.5 w-3.5" />
							</button>
						)}
						<button
							type="button"
							onClick={() => setConfigOpen(true)}
							className={cn(
								'rounded-md p-1.5 transition-colors hover:bg-muted hover:text-foreground',
								isConfigured ? 'text-muted-foreground' : 'text-destructive'
							)}
							title={t('chatView.CONFIGURATION')}
						>
							<Settings className="h-3.5 w-3.5" />
						</button>
					</div>
				</div>
				<div className="mt-2 flex items-center gap-1">
					<button
						type="button"
						onClick={handleNewChat}
						className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium hover:bg-muted"
					>
						<Plus className="h-3.5 w-3.5" />
						{t('chatView.NEW_CHAT')}
					</button>
					<button
						type="button"
						onClick={() => setHistoryOpen((open) => !open)}
						className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium hover:bg-muted"
						aria-expanded={historyOpen}
					>
						<History className="h-3.5 w-3.5" />
						{t('chatView.HISTORY')}
					</button>
				</div>
				{historyOpen ? (
					<div className="absolute left-3 right-3 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border bg-background p-1 shadow-xl">
						{history.length ? (
							history.map((session) => (
								<button
									type="button"
									key={session.id}
									onClick={() => handleSelectHistory(session)}
									className="block w-full rounded-md px-3 py-2 text-left hover:bg-muted"
								>
									<span className="block truncate text-xs font-medium">{session.title}</span>
									<span className="mt-0.5 block text-[11px] text-muted-foreground">
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
							<div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
								<Bot className="h-6 w-6 text-muted-foreground" />
							</div>
							<div>
								<p className="text-sm font-medium text-foreground">{t('chatView.ASSISTANT_NAME')}</p>
								<p className="mt-1 text-xs text-muted-foreground">
									{isConfigured ? t('chatView.EMPTY_CONFIGURED') : t('chatView.EMPTY_NOT_CONFIGURED')}
								</p>
							</div>
							{!isConfigured && (
								<button
									type="button"
									onClick={() => setConfigOpen(true)}
									className="mt-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 dark:bg-primary-light dark:hover:bg-primary-light/90"
								>
									{t('chatView.CONFIGURE_BUTTON')}
								</button>
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
										<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
										<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
										<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
									</div>
								</div>
							)}
							{error && (
								<div className="mx-3 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
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
						className="absolute bottom-16 z-10 rounded-full border border-border bg-background p-1 shadow-sm transition-colors hover:bg-muted"
					>
						<ChevronDown className="h-4 w-4 text-muted-foreground" />
					</button>
				</div>
			)}

			{/* Input */}
			<div className="border-t border-border p-3">
				<form onSubmit={handleSubmit} className="flex items-end gap-2">
					<textarea
						value={input}
						onChange={handleInputChange}
						onKeyDown={(e) => {
							if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
								e.preventDefault();
								if (input.trim() && isConfigured) {
									handleSubmit(e as unknown as React.FormEvent);
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
						className={cn(
							'flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm',
							'ring-offset-background placeholder:text-muted-foreground',
							'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
							'disabled:cursor-not-allowed disabled:opacity-50',
							'max-h-32 min-h-9'
						)}
						style={{ height: 'auto' }}
						ref={(el) => {
							if (el) {
								el.style.height = 'auto';
								el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
							}
						}}
					/>
					{isLoading ? (
						<button
							type="button"
							onClick={stop}
							className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-destructive text-destructive-foreground transition-colors hover:bg-destructive/90"
							title={t('chatView.STOP')}
						>
							<Square className="h-3.5 w-3.5" />
						</button>
					) : (
						<button
							type="submit"
							disabled={!input.trim() || !isConfigured}
							className={cn(
								'flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors',
								'bg-primary text-primary-foreground hover:bg-primary/90',
								'dark:bg-primary-light dark:hover:bg-primary-light/90',
								'disabled:cursor-not-allowed disabled:opacity-50'
							)}
							title={t('chatView.SEND')}
						>
							<Send className="h-3.5 w-3.5" />
						</button>
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
