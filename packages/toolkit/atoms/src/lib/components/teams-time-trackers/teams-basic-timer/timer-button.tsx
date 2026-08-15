import type { ReactElement } from 'react';
import React, { cloneElement } from 'react';
import { CirclePause, CirclePlay } from 'lucide-react';
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

interface TimerIconProps extends ButtonVariances {
	icon?: React.ReactNode;
	isRunning?: boolean;
	className?: string;
}

const TimerButton: React.FC<TimerIconProps> = ({ size, variant, icon, className, isRunning }): ReactElement => {
	const Component = isRunning ? CirclePause : CirclePlay;
	return (
		<span className={cn('inline-flex items-center justify-center', className)}>
			{icon ? (
				cloneElement(icon as React.ReactElement<{ className?: string }>, {
					className: cn(buttonVariants({ size, variant }))
				})
			) : (
				<Component
					className={cn(
						buttonVariants({ size, variant }),
						'hover:scale-110 hover:cursor-pointer hover:opacity-80 hover:duration-300 hover:ease-in-out hover:bg-gray-500/50 dark:hover:bg-gray-700/50 hover:rounded-full hover:p-0.5',
						isRunning && 'text-red-800'
					)}
				/>
			)}
		</span>
	);
};

export default TimerButton;
