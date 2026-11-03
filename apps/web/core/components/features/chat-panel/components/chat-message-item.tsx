'use client';

import { memo, useMemo } from 'react';
import { Bot, User } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { marked } from 'marked';
import type { UIMessage } from 'ai';
import { textOfChatMessage } from '../chat-history';
import DOMPurify from 'dompurify';

// Configure marked for safe rendering
marked.setOptions({
	breaks: true,
	gfm: true
});

interface ChatMessageItemProps {
	message: UIMessage;
}

export const ChatMessageItem = memo(function ChatMessageItem({ message }: ChatMessageItemProps) {
	const isUser = message.role === 'user';
	const text = textOfChatMessage(message);

	const htmlContent = useMemo(() => {
		if (isUser) return null;
		const rawHtml = marked.parse(text) as string;
		return DOMPurify.sanitize(rawHtml);
	}, [text, isUser]);

	return (
		<div className={cn('flex gap-2 py-2', isUser ? 'justify-end' : 'justify-start')}>
			{!isUser && (
				<div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
					<Bot className="size-3.5 text-primary-ink" />
				</div>
			)}
			<div
				className={cn(
					'max-w-[85%] rounded-lg px-3 py-2 text-sm',
					isUser && 'bg-primary text-primary-foreground',
					!isUser && 'bg-muted text-foreground'
				)}
			>
				{isUser ? (
					<p className="whitespace-pre-wrap wrap-break-word">{text}</p>
				) : (
					<div
						className={cn(
							'prose prose-sm dark:prose-invert max-w-none wrap-break-word',
							'[&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
							'[&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-background/50 [&_pre]:p-2 [&_pre]:text-xs',
							'[&_code]:rounded [&_code]:bg-background/50 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs',
							'[&_h1]:text-base [&_h1]:font-semibold',
							'[&_h2]:text-sm [&_h2]:font-medium',
							'[&_h3]:text-sm [&_h3]:font-medium',
							'[&_h4]:text-sm [&_h4]:font-medium',
							'[&_h5]:text-sm [&_h5]:font-normal',
							'[&_h6]:text-sm [&_h6]:font-normal',
							'[&_p]:text-sm [&_p]:leading-relaxed',
							'[&_li]:text-sm',
							'[&_ul]:my-1 [&_ol]:my-1',
							'[&_strong]:font-medium',
							'[&_b]:font-medium',
							'[&_em]:font-normal [&_em]:italic',
							'[&_i]:font-normal [&_i]:italic'
						)}
						dangerouslySetInnerHTML={{ __html: htmlContent ?? '' }}
					/>
				)}
			</div>
			{isUser && (
				<div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
					<User className="size-3.5 text-primary-ink" />
				</div>
			)}
		</div>
	);
});
