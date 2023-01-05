import clsxm from '@app/utils/clsxm';
import { PropsWithChildren } from 'react';

type Props = {
	variant?: 'primary' | 'outline' | 'ghost' | 'light' | 'dark';
} & PropsWithChildren &
	React.ComponentPropsWithRef<'button'>;

export function Button({ children, className, variant = 'primary' }: Props) {
	return (
		<button
			className={clsxm(
				'flex-row items-center justify-center py-3 px-4 gap-3 rounded-md min-w-[180px]',
				[
					variant === 'primary' && [
						'bg-primary dark:bg-primary-light text-white',
					],
				],
				className
			)}
		>
			{children}
		</button>
	);
}
