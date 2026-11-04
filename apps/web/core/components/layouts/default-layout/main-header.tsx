import { IClassName } from '@/core/types/interfaces/common/class-name';
import { clsxm } from '@/core/lib/utils';
import { Container } from '@/core/components';
import { PropsWithChildren } from 'react';

export function MainHeader({ children, className }: PropsWithChildren<IClassName>) {
	return (
		<>
			<div className={clsxm('bg-background pt-20 -mt-8 pb-4', className, 'hairline-b border-border')}>
				<Container>{children}</Container>
			</div>
			{/* <Divider /> */}
		</>
	);
}
