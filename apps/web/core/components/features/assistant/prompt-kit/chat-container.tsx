// Adapted from prompt-kit (https://www.prompt-kit.com), MIT licence.
'use client';

import type { HTMLAttributes, ReactNode, RefObject } from 'react';
import { StickToBottom } from 'use-stick-to-bottom';
import { cn } from '@/core/lib/helpers';

export type ChatContainerRootProps = {
	children: ReactNode;
	className?: string;
} & HTMLAttributes<HTMLDivElement>;

export type ChatContainerContentProps = {
	children: ReactNode;
	className?: string;
	scrollClassName?: string;
} & HTMLAttributes<HTMLDivElement>;

export type ChatContainerScrollAnchorProps = {
	className?: string;
	ref?: RefObject<HTMLDivElement>;
} & HTMLAttributes<HTMLDivElement>;

function ChatContainerRoot({ children, className, ...props }: ChatContainerRootProps) {
	return (
		<StickToBottom
			className={cn('relative flex min-h-0 overflow-hidden', className)}
			resize="smooth"
			initial="instant"
			role="log"
			{...props}
		>
			{children}
		</StickToBottom>
	);
}

function ChatContainerContent({ children, className, scrollClassName, ...props }: ChatContainerContentProps) {
	return (
		<StickToBottom.Content
			className={cn('flex w-full flex-col', className)}
			scrollClassName={scrollClassName}
			{...props}
		>
			{children}
		</StickToBottom.Content>
	);
}

function ChatContainerScrollAnchor({ className, ...props }: ChatContainerScrollAnchorProps) {
	return <div className={cn('h-px w-full shrink-0 scroll-mt-4', className)} aria-hidden="true" {...props} />;
}

export { ChatContainerRoot, ChatContainerContent, ChatContainerScrollAnchor };
