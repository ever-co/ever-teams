import { IClassName } from '@/core/types/interfaces/common/class-name';
import { clsxm } from '@/core/lib/utils';
import { PropsWithChildren } from 'react';

export function Container({ children, className }: PropsWithChildren<Pick<IClassName, 'className'>>) {
	return (
		<div className="p-0 m-0 w-full">
			<div className={clsxm('w-full px-4 sm:px-6 lg:px-8', className)}>{children}</div>
		</div>
	);
}
