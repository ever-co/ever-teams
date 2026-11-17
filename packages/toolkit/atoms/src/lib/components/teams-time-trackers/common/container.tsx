'use client';

import React from 'react';
import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';
import { cn } from '@ever-teams/toolkit-ui';
import type { ProgressIndicatorVariances, ProgressVariances } from './progress';
import Progress from './progress';

// The timer's surface: a card drawn with a ring and a tinted shadow in the kit's tokens, so it follows the color
// scheme on any host page. background="none" and rounded="none" give back the bare digits of earlier versions.
// The hover tint is an image over the background color, which it never replaces: the card stays opaque.
export const containerVariants = cva(
	[
		'group relative inline-flex items-center justify-center gap-3 whitespace-nowrap py-1.5 pr-1.5 pl-3',
		'rounded-xl bg-card text-card-foreground ring-1 ring-border shadow-sm shadow-black/6.5',
		'transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary',
		'hover:bg-[linear-gradient(hsl(var(--foreground)/0.025),hsl(var(--foreground)/0.025))]',
		'disabled:cursor-not-allowed disabled:opacity-60'
	],
	{
		variants: {
			size: {
				small: 'text-sm',
				medium: 'text-base',
				large: 'text-lg'
			},
			color: {
				primary: 'text-primary',
				secondary: 'text-secondary',
				destructive: 'text-destructive'
			},
			rounded: {
				none: 'rounded-none',
				small: 'rounded-xl',
				medium: 'rounded-2xl',
				large: 'rounded-3xl'
			},
			border: {
				none: 'border-none',
				thin: 'border border-gray-300',
				thick: 'border-2 border-gray-500'
			},
			background: {
				none: 'bg-transparent shadow-none ring-0 hover:bg-none',
				destructive: 'bg-destructive',
				secondary: 'bg-secondary',
				primary: 'bg-primary'
			}
		},
		defaultVariants: {
			size: 'medium'
		}
	}
);

export type ContainerVariants = VariantProps<typeof containerVariants>;

type ButtonBase = React.ButtonHTMLAttributes<HTMLButtonElement>;
export interface ContainerProps extends Omit<ButtonBase, 'color'>, ContainerVariants {
	progress?: number;
	progressStyle?: React.CSSProperties;
	progressVariant?: ProgressIndicatorVariances['variant'];
	className?: string;
}

const Container = ({
	ref,
	size,
	color,
	rounded,
	border,
	background,
	progress,
	progressStyle,
	progressVariant,
	children,
	className,
	...props
}: ContainerProps & {
	ref?: React.RefObject<HTMLButtonElement>;
}) => {
	let progressSize = 'full' as ProgressVariances['size'];

	if (rounded === 'small') {
		progressSize = 'medium';
	} else if (rounded === 'large') {
		progressSize = 'small';
	}

	const renderProgress = typeof progress === 'number' && (
		<Progress
			inside={!border}
			progress={progress}
			size={progressSize}
			sx={progressStyle}
			variant={progressVariant}
		/>
	);

	return (
		<button
			className={cn(containerVariants({ size, color, rounded, border, background }), className)}
			ref={ref}
			type="button"
			{...props}
		>
			{children}
			{renderProgress}
		</button>
	);
};

Container.displayName = 'Container';
export default Container;
