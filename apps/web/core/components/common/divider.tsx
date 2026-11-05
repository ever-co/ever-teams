import { clsxm } from '@/core/lib/utils';
import { IClassName } from '@/core/types/interfaces/common/class-name';

export function Divider({ className, type = 'HORIZONTAL' }: IClassName) {
	if (type === 'HORIZONTAL') {
		return <hr className={clsxm('w-full border-border', className)} />;
	}

	if (type === 'VERTICAL') {
		return <div className={clsxm('h-full w-px bg-border', className)}></div>;
	}

	return <hr className={clsxm('w-full border-border', className)} />;
}
