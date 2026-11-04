import { IClassName } from '@/core/types/interfaces/common/class-name';
import { clsxm } from '@/core/lib/utils';

export const VerticalSeparator = ({ className }: IClassName) => {
	return <div className={clsxm('w-px self-stretch bg-border', className)} />;
};

export const HorizontalSeparator = ({ className }: IClassName) => {
	return (
		<div className="px-2 w-full">
			<div className={clsxm('h-px w-full bg-border', className)} />
		</div>
	);
};
