'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bot, Settings, Trash2, Send, Square, ChevronDown } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { cn } from '@/core/lib/helpers';
import { ScrollArea } from '@/core/components/common/scroll-area';
import { ChatConfigDialog, type ChatConfig } from './chat-config-dialog';
import { ChatMessageItem } from './chat-message-item';

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
	const [config, setConfig] = useState<ChatConfig | null>(null);
	const [configOpen, setConfigOpen] = useState(false);
	const [mounted, setMounted] = useState(false);

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
		setMessages([]);
	}, [setMessages]);

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

	const isConfigured = !!config?.apiKey;

	return (
		<div className="flex h-full flex-col dark:bg-dark-high">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-border px-3 py-2">
				<div className="flex items-center gap-2">
					<Bot className="h-4 w-4 text-primary dark:text-primary-light" />
					<span className="text-sm font-semibold text-foreground">Chat AI</span>
				</div>
				<div className="flex items-center gap-1">
					{messages.length > 0 && (
						<button
							type="button"
							onClick={handleClearChat}
							className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
							title="Clear conversation"
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
						title="Configuration"
					>
						<Settings className="h-3.5 w-3.5" />
					</button>
				</div>
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
								<p className="text-sm font-medium text-foreground">Ever Teams Assistant</p>
								<p className="mt-1 text-xs text-muted-foreground">
									{isConfigured
										? 'Ask a question to get started.'
										: 'Configure your API key to get started.'}
								</p>
							</div>
							{!isConfigured && (
								<button
									type="button"
									onClick={() => setConfigOpen(true)}
									className="mt-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 dark:bg-primary-light dark:hover:bg-primary-light/90"
								>
									Configure
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
									{error.message || 'An error occurred. Please check your configuration.'}
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
							if (e.key === 'Enter' && !e.shiftKey) {
								e.preventDefault();
								if (input.trim() && isConfigured) {
									handleSubmit(e as unknown as React.FormEvent);
								}
							}
						}}
						placeholder={isConfigured ? 'Your message...' : 'Configure your API key...'}
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
							title="Stop"
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
							title="Send"
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
