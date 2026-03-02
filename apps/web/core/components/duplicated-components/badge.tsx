import { IClassName } from '@/core/types/interfaces/common/class-name';
import { clsxm } from '@/core/lib/utils';
import { PropsWithChildren } from 'react';

export function OutlineBadge({
	className,
	children,
	onClick
}: PropsWithChildren<IClassName & { onClick?: () => void }>) {
	return (
		<div
			className={clsxm('flex inline-flex gap-x-2 items-center p-2 px-5 text-sm whitespace-nowrap rounded-3xl border text-nowrap', className)}
			onClick={onClick}
		>
			{children}
		</div>
	);
}
