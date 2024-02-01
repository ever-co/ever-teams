import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { PropsWithChildren } from 'react';

export function Container({ children, className, fullWidth }: PropsWithChildren<IClassName>) {
	return <div className={clsxm(!fullWidth && 'x-container', fullWidth && 'mx-8', className)}>{children}</div>;
}
