'use client';

import { memo, useEffect, useState } from 'react';
import type { UIMessage } from 'ai';
import { useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { Check, Copy } from '@/core/components/icons';
import { textOfChatMessage } from '@/core/components/features/chat-panel/chat-history';
import { TypingLoader } from '../prompt-kit/loader';
import { Message, MessageAction, MessageActions, MessageContent } from '../prompt-kit/message';

const COPIED_FEEDBACK_MS = 1500;

function CopyMessageButton({ text }: Readonly<{ text: string }>) {
	const t = useTranslations();
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (!copied) {
			return;
		}
		const timer = window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
		return () => window.clearTimeout(timer);
	}, [copied]);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
		} catch {
			setCopied(false);
		}
	};

	let label = t('chatView.COPY');
	let icon = <Copy className="size-4" />;
	if (copied) {
		label = t('chatView.COPIED');
		icon = <Check className="size-4" />;
	}

	return (
		<MessageAction tooltip={label}>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				className="text-muted-foreground"
				onClick={handleCopy}
				aria-label={label}
			>
				{icon}
			</Button>
		</MessageAction>
	);
}

function UserMessage({ content, authorName }: Readonly<{ content: string; authorName: string }>) {
	return (
		<Message className="flex-col gap-1 rounded-xl bg-card px-3.5 py-2.5 shadow-sm shadow-black/6.5 hairline-ring ring-border">
			<span className="text-xs font-medium text-muted-foreground">{authorName}</span>
			<MessageContent className="text-sm leading-6 whitespace-pre-wrap">{content}</MessageContent>
		</Message>
	);
}

function AnswerMessage({
	id,
	content,
	authorName,
	isStreaming
}: Readonly<{
	id: string;
	content: string;
	authorName: string;
	isStreaming: boolean;
}>) {
	const hasContent = content.length > 0;
	const canCopy = hasContent && !isStreaming;
	const isWaitingForFirstToken = !hasContent && isStreaming;

	return (
		<Message className="flex-col gap-1 px-0.5">
			<span className="text-xs font-medium text-muted-foreground">{authorName}</span>
			{isWaitingForFirstToken && <TypingLoader size="sm" />}
			{hasContent && (
				<MessageContent markdown id={id}>
					{content}
				</MessageContent>
			)}
			{canCopy && (
				<MessageActions className="-ml-1.5">
					<CopyMessageButton text={content} />
				</MessageActions>
			)}
		</Message>
	);
}

type AssistantMessageProps = {
	message: UIMessage;
	userName: string;
	assistantName: string;
	isStreaming: boolean;
};

export const AssistantMessage = memo(function AssistantMessage({
	message,
	userName,
	assistantName,
	isStreaming
}: AssistantMessageProps) {
	if (message.role === 'user') {
		return <UserMessage content={textOfChatMessage(message)} authorName={userName} />;
	}
	return (
		<AnswerMessage
			id={message.id}
			content={textOfChatMessage(message)}
			authorName={assistantName}
			isStreaming={isStreaming}
		/>
	);
});
