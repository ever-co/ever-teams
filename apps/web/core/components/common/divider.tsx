import { clsxm } from '@/core/lib/utils';
import { IClassName } from '@/core/types/interfaces/common/class-name';

export function Divider({ className, type = 'HORIZONTAL' }: IClassName) {
	if (type === 'HORIZONTAL') {
		return <hr className={clsxm('w-full dark:opacity-25', className)} />;
	}

	if (type === 'VERTICAL') {
		return <div className={clsxm('h-full w-[1px] bg-[#b1aebc80]', className)}></div>;
	}

	return <hr className={clsxm('w-full dark:opacity-25', className)} />;
}
