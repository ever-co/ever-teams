import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { PropsWithChildren } from 'react';

export function Container({
	children,
	className,
}: PropsWithChildren<IClassName>) {
	return <div className={clsxm('x-container', className)}>{children}</div>;
}
