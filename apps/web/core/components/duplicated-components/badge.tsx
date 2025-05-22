import { IClassName } from '@/core/types/interfaces/to-review';
import { clsxm } from '@/core/lib/utils';
import { PropsWithChildren } from 'react';

export function OutlineBadge({
	className,
	children,
	onClick
}: PropsWithChildren<IClassName & { onClick?: () => void }>) {
	return (
		<div
			className={clsxm('p-2 px-5 border inline-flex items-center rounded-3xl text-sm space-x-2', className)}
			onClick={onClick}
		>
			{children}
		</div>
	);
}
