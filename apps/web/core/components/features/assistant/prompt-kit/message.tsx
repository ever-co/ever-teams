// Adapted from prompt-kit (https://www.prompt-kit.com), MIT licence.
'use client';

import type { ComponentProps, HTMLProps, ReactNode } from 'react';
import { cn } from '@/core/lib/helpers';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/components/common/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';
import { Markdown } from './markdown';

export type MessageProps = {
	children: ReactNode;
	className?: string;
} & HTMLProps<HTMLDivElement>;

const Message = ({ children, className, ...props }: MessageProps) => (
	<div className={cn('flex gap-3', className)} {...props}>
		{children}
	</div>
);

export type MessageAvatarProps = {
	src: string;
	alt: string;
	fallback?: string;
	delayMs?: number;
	className?: string;
};

const MessageAvatar = ({ src, alt, fallback, delayMs, className }: MessageAvatarProps) => {
	return (
		<Avatar className={cn('size-8 shrink-0', className)}>
			<AvatarImage src={src} alt={alt} />
			{fallback && <AvatarFallback delayMs={delayMs}>{fallback}</AvatarFallback>}
		</Avatar>
	);
};

const markdownProseRecipe =
	'prose prose-sm max-w-none dark:prose-invert prose-p:leading-6 prose-li:leading-6 prose-a:text-primary-ink prose-strong:font-semibold prose-headings:font-semibold [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto';

function toMarkdownSource(children: ReactNode) {
	if (typeof children === 'string') {
		return children;
	}
	return '';
}

export type MessageContentProps = {
	children: ReactNode;
	markdown?: boolean;
	className?: string;
} & HTMLProps<HTMLDivElement>;

const MessageContent = ({ children, markdown = false, className, ...props }: MessageContentProps) => {
	const classNames = cn(
		'min-w-0 break-words whitespace-normal text-foreground',
		markdown && markdownProseRecipe,
		className
	);

	if (markdown) {
		const source = toMarkdownSource(children);
		return (
			<Markdown className={classNames} id={props.id}>
				{source}
			</Markdown>
		);
	}

	return (
		<div className={classNames} {...props}>
			{children}
		</div>
	);
};

export type MessageActionsProps = {
	children: ReactNode;
	className?: string;
} & HTMLProps<HTMLDivElement>;

const MessageActions = ({ children, className, ...props }: MessageActionsProps) => (
	<div className={cn('flex items-center gap-1 text-muted-foreground', className)} {...props}>
		{children}
	</div>
);

export type MessageActionProps = {
	className?: string;
	tooltip: ReactNode;
	children: ReactNode;
	side?: 'top' | 'bottom' | 'left' | 'right';
} & ComponentProps<typeof Tooltip>;

const MessageAction = ({ tooltip, children, className, side = 'top', ...props }: MessageActionProps) => {
	return (
		<Tooltip {...props}>
			<TooltipTrigger asChild>{children}</TooltipTrigger>
			<TooltipContent side={side} className={className}>
				{tooltip}
			</TooltipContent>
		</Tooltip>
	);
};

export { Message, MessageAvatar, MessageContent, MessageActions, MessageAction };
