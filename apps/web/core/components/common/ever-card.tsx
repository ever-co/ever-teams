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
				'bg-light--theme-light',
				'dark:bg-dark--theme-light',
				'rounded-[16px] px-4 py-8 md:px-8',
				shadow === 'bigger' && ['shadow-lg card dark:shadow-none'],
				className
			)}
			{...rest}
		>
			{children}
		</div>
	);
}
