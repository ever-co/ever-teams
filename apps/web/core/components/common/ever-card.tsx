import { clsxm } from '@/core/lib/utils';
import { PropsWithChildren } from 'react';

type Props = {
	shadow: 'bigger' | 'custom';
} & PropsWithChildren &
	React.ComponentPropsWithRef<'div'>;

export function EverCard({ children, className, shadow, ...rest }: Props) {
	return (
		<div
			className={clsxm(
				'bg-card border border-border',
				'rounded-xl px-3 py-4 md:px-5',
				shadow === 'bigger' && ['shadow-lg card dark:shadow-none'],
				className
			)}
			{...rest}
		>
			{children}
		</div>
	);
}
