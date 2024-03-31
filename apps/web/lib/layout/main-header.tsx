import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Container } from 'lib/components';
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
