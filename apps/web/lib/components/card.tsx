import clsxm from '@app/utils/clsxm';
import { PropsWithChildren } from 'react';

type Props = {
	shadow: 'bigger' | 'custom';
} & PropsWithChildren &
	React.ComponentPropsWithRef<'div'>;

export default function Card({ children, className, shadow, ...rest }: Props) {
	return (
		<div
			className={clsxm(
				'bg-light--theme-light',
				'dark:bg-dark--theme-light',
				'rounded-[16px]',
				shadow === 'bigger' && 'shadow-[0px_50px_200px_rgba(0,_0,_0,_0.1)]',
				className
			)}
			{...rest}
		>
			{children}
		</div>
	);
}
