import React from 'react';
import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';
import { cn } from '@ever-teams/toolkit-ui';

const progressVariants = cva('absolute left-0 h-0.5', {
	variants: {
		size: {
			full: 'w-full',
			medium: 'w-[88%] left-[6%]',
			small: 'w-[76%] left-[12%]'
		}
	},
	defaultVariants: {
		size: 'full'
	}
});

const progressIndicatorVariants = cva('absolute left-0 h-0.5', {
	variants: {
		variant: {
			none: 'bg-red-700',
			primary: 'bg-purple-500',
			secondary: 'bg-green-500'
		}
	},
	defaultVariants: {
		variant: 'primary'
	}
});

export type ProgressVariances = VariantProps<typeof progressVariants>;
export type ProgressIndicatorVariances = VariantProps<typeof progressIndicatorVariants>;

interface TimerProgressProps extends ProgressVariances, ProgressIndicatorVariances {
	progress: number;
	sx?: React.CSSProperties;
	inside?: boolean;
}

const Progress: React.FC<TimerProgressProps> = ({ variant, size = 'full', progress, inside = false, sx }) => {
	return (
		<div
			className={cn(
				'absolute left-0 -bottom-0.5 w-full h-1 bg-gray-200 dark:bg-gray-200/50 mt-2',
				inside ? 'bottom-0' : '-bottom-0.5',
				progressVariants({
					size
				}),
				sx
			)}
		>
			<div
				className={cn(
					progressIndicatorVariants({
						variant
					})
				)}
				style={{ width: `${progress}%` }}
			/>
		</div>
	);
};

export default Progress;
