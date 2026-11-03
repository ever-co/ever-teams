// Adapted from prompt-kit (https://www.prompt-kit.com), MIT licence.
'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Button, type ButtonSize, type ButtonVariant } from '@/core/components/duplicated-components/_button';
import { cn } from '@/core/lib/helpers';

export type PromptSuggestionProps = {
	children: ReactNode;
	variant?: ButtonVariant;
	size?: ButtonSize;
	className?: string;
	highlight?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const pillRecipe = 'rounded-full text-[13px] font-normal text-foreground';

const rowRecipe = 'w-full cursor-pointer justify-start rounded-lg py-2 text-[13px] font-normal hover:bg-foreground/5';

function trimHighlight(highlight: string | undefined) {
	if (!highlight) {
		return '';
	}
	return highlight.trim();
}

function textContent(children: ReactNode) {
	if (typeof children === 'string') {
		return children;
	}
	return '';
}

function HighlightedText({ content, highlight }: Readonly<{ content: string; highlight: string }>) {
	const contentLower = content.toLowerCase();
	const highlightLower = highlight.toLowerCase();
	const index = contentLower.indexOf(highlightLower);

	if (index === -1) {
		return <span className="whitespace-pre-wrap text-muted-foreground">{content}</span>;
	}

	const highlightEnd = index + highlightLower.length;
	const before = content.substring(0, index);
	const highlighted = content.substring(index, highlightEnd);
	const after = content.substring(highlightEnd);

	return (
		<>
			{before && <span className="whitespace-pre-wrap text-muted-foreground">{before}</span>}
			<span className="whitespace-pre-wrap font-medium text-primary-ink">{highlighted}</span>
			{after && <span className="whitespace-pre-wrap text-muted-foreground">{after}</span>}
		</>
	);
}

function PromptSuggestion({ children, variant, size, className, highlight, ...props }: PromptSuggestionProps) {
	const trimmedHighlight = trimHighlight(highlight);
	const isHighlightMode = trimmedHighlight !== '';
	const content = textContent(children);

	if (!isHighlightMode) {
		return (
			<Button
				type="button"
				variant={variant ?? 'outline'}
				size={size ?? 'default'}
				className={cn(pillRecipe, className)}
				{...props}
			>
				{children}
			</Button>
		);
	}

	if (!content) {
		return (
			<Button
				type="button"
				variant={variant ?? 'ghost'}
				size={size ?? 'sm'}
				className={cn(rowRecipe, className)}
				{...props}
			>
				{children}
			</Button>
		);
	}

	return (
		<Button
			type="button"
			variant={variant ?? 'ghost'}
			size={size ?? 'sm'}
			className={cn(rowRecipe, 'gap-0', className)}
			{...props}
		>
			<HighlightedText content={content} highlight={trimmedHighlight} />
		</Button>
	);
}

export { PromptSuggestion };
