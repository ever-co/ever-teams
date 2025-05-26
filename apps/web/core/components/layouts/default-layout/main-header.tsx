import { IClassName } from '@/core/types/interfaces/global/IClassName';
import { clsxm } from '@/core/lib/utils';
import { Container } from '@/core/components';
import { PropsWithChildren } from 'react';

export function MainHeader({ children, className, fullWidth }: PropsWithChildren<IClassName>) {
	return (
		<>
			<div
				className={clsxm(
					'bg-white dark:bg-dark-high  pt-20 -mt-8 pb-4',
					className,
					'border-[#eeeeeee9]  border-b-[0.125rem] dark:border-b-[#26272cd6] dark:shadow-lg '
				)}
			>
				<Container fullWidth={fullWidth}>{children}</Container>
			</div>
			{/* <Divider /> */}
		</>
	);
}
