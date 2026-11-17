import type { ReactElement } from 'react';
import React, { cloneElement } from 'react';
import { Play, Square } from 'lucide-react';
import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';
import { cn } from '@ever-teams/toolkit-ui';

export const buttonVariants = cva('inline-flex items-center justify-center', {
	variants: {
		size: {
			small: 'w-4 h-4',
			medium: 'w-6 h-6',
			large: 'w-8 h-8',
			'extra-large': 'w-14 h-14'
		},
		variant: {
			none: 'text-none dark:text-none',
			primary: 'text-primary dark:text-primary',
			secondary: 'text-secondary dark:text-secondary',
			destructive: 'text-destructive dark:text-destructive'
		}
	},
	defaultVariants: {
		size: 'small',
		variant: 'none'
	}
});

export type ButtonVariances = VariantProps<typeof buttonVariants>;

// The play or stop control: a filled chip in the brand color (destructive while running), with the ring and tinted
// shadow of a primary button. The whole timer is the button; the chip is its visible action.
const chipVariants = cva(
	[
		'inline-flex shrink-0 items-center justify-center text-white transition-colors',
		'shadow-md shadow-black/15 ring-1 ring-black/15 dark:ring-white/15',
		'[&_svg]:size-1/2 [&_svg]:fill-current [&_svg]:drop-shadow-sm'
	],
	{
		variants: {
			size: {
				small: 'size-7 rounded-lg',
				medium: 'size-8 rounded-lg',
				large: 'size-9 rounded-lg',
				'extra-large': 'size-14 rounded-xl'
			},
			tone: {
				primary: 'bg-primary group-hover:bg-primary/90',
				secondary: 'bg-secondary text-secondary-foreground group-hover:bg-secondary/90',
				destructive: 'bg-destructive group-hover:bg-destructive/90'
			}
		},
		defaultVariants: {
			size: 'small',
			tone: 'primary'
		}
	}
);

type ChipTone = VariantProps<typeof chipVariants>['tone'];

function chipTone(variant: ButtonVariances['variant'], isRunning?: boolean): ChipTone {
	if (isRunning) {
		return 'destructive';
	}
	if (variant === 'secondary' || variant === 'destructive') {
		return variant;
	}
	return 'primary';
}

interface TimerIconProps extends ButtonVariances {
	icon?: React.ReactNode;
	isRunning?: boolean;
	className?: string;
}

function RunningIcon({ isRunning }: { isRunning?: boolean }) {
	if (isRunning) {
		return <Square aria-hidden="true" />;
	}
	return <Play aria-hidden="true" />;
}

const TimerButton: React.FC<TimerIconProps> = ({ size, variant, icon, className, isRunning }): ReactElement => {
	return (
		<span className={cn('inline-flex items-center justify-center', className)}>
			{icon ? (
				cloneElement(icon as React.ReactElement<{ className?: string }>, {
					className: cn(buttonVariants({ size, variant }))
				})
			) : (
				<span className={chipVariants({ size, tone: chipTone(variant, isRunning) })}>
					<RunningIcon isRunning={isRunning} />
				</span>
			)}
		</span>
	);
};

export default TimerButton;
