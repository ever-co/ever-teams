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
			className={clsxm(
				'inline-flex items-center gap-x-2 whitespace-nowrap rounded-md bg-card px-2.5 py-1 text-sm text-foreground hairline-ring ring-border',
				className
			)}
			onClick={onClick}
		>
			{children}
		</div>
	);
}
