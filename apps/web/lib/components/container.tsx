import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Transition } from '@headlessui/react';
import { PropsWithChildren } from 'react';

export function Container({ children, className, fullWidth }: PropsWithChildren<IClassName>) {
	return (
		<Transition
			show={true}
			enter="transition-opacity duration-75"
			enterFrom="opacity-0"
			enterTo="opacity-100"
			leave="transition-opacity duration-150"
			leaveFrom="opacity-100"
			leaveTo="opacity-0"
			className="w-full p-0 m-0"
		>
			<div className={clsxm('transition-all', !fullWidth && 'x-container', fullWidth && 'px-8', className)}>
				{children}
			</div>
		</Transition>
	);
}
