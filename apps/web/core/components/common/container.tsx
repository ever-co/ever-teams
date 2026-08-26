import { IClassName } from '@/core/types/interfaces/common/class-name';
import { clsxm } from '@/core/lib/utils';
import { Transition } from '@headlessui/react';
import { PropsWithChildren } from 'react';

export function Container({ children, className }: PropsWithChildren<Pick<IClassName, 'className'>>) {
	return (
		<Transition
			as="div"
			show={true}
			enter="transition-opacity duration-75"
			enterFrom="opacity-0"
			enterTo="opacity-100"
			leave="transition-opacity duration-150"
			leaveFrom="opacity-100"
			leaveTo="opacity-0"
			className="p-0 m-0 w-full"
		>
			<div className={clsxm('w-full px-4 sm:px-6 lg:px-8 transition-all', className)}>{children}</div>
		</Transition>
	);
}
