import clsxm from '@app/utils/clsxm';
import { PropsWithChildren } from 'react';

export function Container({
	children,
	className,
}: PropsWithChildren & { className?: string }) {
	return <div className={clsxm('x-container', className)}>{children}</div>;
}
