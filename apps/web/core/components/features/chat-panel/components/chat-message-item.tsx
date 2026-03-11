'use client';

import { memo, useMemo } from 'react';
import { Bot, User } from 'lucide-react';
import { cn } from '@/core/lib/helpers';
import { marked } from 'marked';
import type { Message } from '@ai-sdk/react';

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
		return marked.parse(message.content) as string;
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
						className="prose prose-sm dark:prose-invert max-w-none wrap-break-word [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-background/50 [&_pre]:p-2 [&_pre]:text-xs [&_code]:rounded [&_code]:bg-background/50 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs"
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
