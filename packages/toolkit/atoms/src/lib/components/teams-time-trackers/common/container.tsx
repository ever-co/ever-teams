'use client';

import React from 'react';
import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';
import { cn } from '@ever-teams/toolkit-ui';
import type { ProgressIndicatorVariances, ProgressVariances } from './progress';
import Progress from './progress';

export const containerVariants = cva('relative gap-1 py-2 px-3 flex items-center justify-center', {
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
			none: 'transparent',
			destructive: 'bg-destructive',
			secondary: 'bg-secondary',
			primary: 'bg-primary'
		}
	},
	defaultVariants: {
		size: 'medium',
		color: 'primary',
		rounded: 'none',
		border: 'none',
		background: 'none'
	}
});

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
