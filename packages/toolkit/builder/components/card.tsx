import { cn } from '@ever-teams/toolkit-ui';
import { forwardRef } from 'react';

type Props = {
	shadow: 'bigger' | 'custom';
	children?: React.ReactNode;
} & React.ComponentPropsWithRef<'div'>;

export const Card = forwardRef<HTMLDivElement, Props>(({ children, className, shadow, ...rest }, ref) => {
	return (
		<div
			className={cn(
				'bg-[#f7f7f8]',
				'dark:bg-[#1E2025]',
				'rounded-[16px] px-4 py-8 md:px-8',
				shadow === 'bigger' && ['shadow-lgcard dark:shadow-none'],
				className
			)}
			ref={ref}
			{...rest}
		>
			{children}
		</div>
	);
});

Card.displayName = 'Card';
