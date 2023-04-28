import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Container, Divider } from 'lib/components';
import { PropsWithChildren } from 'react';

export function MainHeader({
	children,
	className,
}: PropsWithChildren<IClassName>) {
	return (
		<>
			<div
				className={clsxm(
					'bg-white dark:bg-dark--theme pt-16 -mt-8 pb-4',
					className
				)}
			>
				<Container>{children}</Container>
			</div>
			<Divider />
		</>
	);
}
