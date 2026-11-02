import { clsxm } from '@/core/lib/utils';
import { PropsWithChildren } from 'react';

type Props = {
	shadow: 'bigger' | 'custom';
} & PropsWithChildren &
	React.ComponentPropsWithRef<'div'>;

export function EverCard({ children, className, shadow, ...rest }: Props) {
	const isPromoted = shadow === 'bigger';
	return (
		<div
			className={clsxm(
				'bg-card text-card-foreground hairline-border border-transparent hairline-ring ring-border',
				'rounded-xl px-3 py-4 md:px-5',
				isPromoted && 'shadow-md shadow-black/6.5',
				!isPromoted && 'shadow-sm shadow-black/6.5',
				className
			)}
			{...rest}
		>
			{children}
		</div>
	);
}
