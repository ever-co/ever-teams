import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';

export const VerticalSeparator = ({ className }: IClassName) => {
	return (
		<div
			className={clsxm(
				'w-1 self-stretch border-l-[2px] dark:border-l-gray-600',
				className
			)}
		/>
	);
};
