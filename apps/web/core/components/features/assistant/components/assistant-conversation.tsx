'use client';

import type { UIMessage } from 'ai';
import { useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { CircleAlert } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { ChatContainerContent, ChatContainerRoot } from '../prompt-kit/chat-container';
import { TypingLoader } from '../prompt-kit/loader';
import { ScrollButton } from '../prompt-kit/scroll-button';
import { ASSISTANT_COLUMN, readableChatError } from '../assistant-helpers';
import { AssistantMessage } from './assistant-message';

type AssistantConversationProps = {
	messages: UIMessage[];
	userName: string;
	assistantName: string;
	isStreaming: boolean;
	isWaitingForAnswer: boolean;
	error: Error | undefined;
	isConfigured: boolean;
	onRetry: () => void;
	onOpenConfig: () => void;
};

function ThinkingRow() {
	const t = useTranslations();
	return (
		<output className="flex items-center gap-2 px-0.5 text-[13px] text-muted-foreground">
			<TypingLoader size="sm" />
			<span>{t('chatView.THINKING')}</span>
		</output>
	);
}

function ErrorRow({
	error,
	isConfigured,
	onRetry,
	onOpenConfig
}: Readonly<{
	error: Error;
	isConfigured: boolean;
	onRetry: () => void;
	onOpenConfig: () => void;
}>) {
	const t = useTranslations();
	const fallback = t('chatView.ERROR_FALLBACK');
	const message = readableChatError(error, fallback);

	let action = (
		<Button type="button" variant="outline" size="sm" onClick={onRetry}>
			{t('chatView.RETRY')}
		</Button>
	);
	if (!isConfigured) {
		action = (
			<Button type="button" variant="outline" size="sm" onClick={onOpenConfig}>
				{t('chatView.CONFIGURE_BUTTON')}
			</Button>
		);
	}

	return (
		<div
			role="alert"
			className="flex flex-col gap-2 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-[13px] text-destructive-ink sm:flex-row sm:items-center"
		>
			<div className="flex min-w-0 flex-1 items-start gap-2">
				<CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
				<p className="min-w-0 break-words">{message}</p>
			</div>
			<div className="shrink-0">{action}</div>
		</div>
	);
}

function isLastMessage(index: number, messages: UIMessage[]) {
	return index === messages.length - 1;
}

export function AssistantConversation({
	messages,
	userName,
	assistantName,
	isStreaming,
	isWaitingForAnswer,
	error,
	isConfigured,
	onRetry,
	onOpenConfig
}: Readonly<AssistantConversationProps>) {
	const t = useTranslations();

	return (
		<ChatContainerRoot className="min-h-0 flex-1">
			<ChatContainerContent
				className={cn(ASSISTANT_COLUMN, 'gap-6 px-4 pt-6 pb-10')}
				scrollClassName="custom-scrollbar"
			>
				{messages.map((message, index) => {
					const isLast = isLastMessage(index, messages);
					const isStreamingMessage = isLast && isStreaming;
					return (
						<AssistantMessage
							key={message.id}
							message={message}
							userName={userName}
							assistantName={assistantName}
							isStreaming={isStreamingMessage}
						/>
					);
				})}
				{isWaitingForAnswer && <ThinkingRow />}
				{error && (
					<ErrorRow error={error} isConfigured={isConfigured} onRetry={onRetry} onOpenConfig={onOpenConfig} />
				)}
			</ChatContainerContent>
			<div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
				<ScrollButton aria-label={t('chatView.SCROLL_TO_BOTTOM')} />
			</div>
		</ChatContainerRoot>
	);
}
