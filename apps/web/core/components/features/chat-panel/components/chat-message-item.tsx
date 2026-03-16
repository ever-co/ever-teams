'use client';

import { memo, useMemo } from 'react';
import { Bot, User } from 'lucide-react';
import { cn } from '@/core/lib/helpers';
import { marked } from 'marked';
import type { Message } from '@ai-sdk/react';
import DOMPurify from 'dompurify';

// Configure marked for safe rendering
marked.setOptions({
	breaks: true,
	gfm: true
});

interface ChatMessageItemProps {
	message: Message;
}

export const ChatMessageItem = memo(function ChatMessageItem({ message }: ChatMessageItemProps) {
	const isUser = message.role === 'user';

	const htmlContent = useMemo(() => {
		if (isUser) return null;
		const rawHtml = marked.parse(message.content) as string;
		return DOMPurify.sanitize(rawHtml);
	}, [message.content, isUser]);

	return (
		<div className={cn('flex gap-2 py-2', isUser ? 'justify-end' : 'justify-start')}>
			{!isUser && (
				<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 dark:bg-primary-light/10">
					<Bot className="h-3.5 w-3.5 text-primary dark:text-primary-light" />
				</div>
			)}
			<div
				className={cn(
					'max-w-[85%] rounded-lg px-3 py-2 text-sm',
					isUser ? 'bg-primary text-primary-foreground dark:bg-primary-light' : 'bg-muted text-foreground'
				)}
			>
				{isUser ? (
					<p className="whitespace-pre-wrap wrap-break-word">{message.content}</p>
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
				<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 dark:bg-primary-light/10">
					<User className="h-3.5 w-3.5 text-primary dark:text-primary-light" />
				</div>
			)}
		</div>
	);
});
