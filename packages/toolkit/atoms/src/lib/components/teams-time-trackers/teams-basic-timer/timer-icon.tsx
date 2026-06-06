import type { ReactElement } from 'react';
import React, { cloneElement } from 'react';
import { Clock } from 'lucide-react';
import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';
import { cn } from '@ever-teams/toolkit-ui';

export const iconVariants = cva('inline-flex items-center justify-center', {
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
		size: 'medium',
		variant: 'none'
	}
});

export type IconVariances = VariantProps<typeof iconVariants>;

interface TimerIconProps extends IconVariances {
	icon?: React.ReactNode;
	className?: string;
}

function DefaultIcon({ size = 'small', variant }: Readonly<IconVariances>): ReactElement {
	return <Clock className={cn(iconVariants({ size, variant }))} />;
}

const TimerIcon: React.FC<TimerIconProps> = ({ size, variant, icon, className }): ReactElement => {
	return (
		<span className={cn('inline-flex items-center justify-center text-black/80 dark:text-white', className)}>
			{icon ? (
				cloneElement(icon as React.ReactElement<{ className?: string }>, {
					className: cn(iconVariants({ size, variant }))
				})
			) : (
				<DefaultIcon size={size} variant={variant} />
			)}
		</span>
	);
};

export default TimerIcon;
