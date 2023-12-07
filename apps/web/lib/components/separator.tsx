import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';

export const VerticalSeparator = ({ className }: IClassName) => {
	return <div className={clsxm('w-1 self-stretch border-l-[0.125rem] dark:border-l-[#FFFFFF14]', className)} />;
};

export const HorizontalSeparator = ({ className }: IClassName) => {
	return (
		<div className="px-2 w-full">
			<div className={clsxm('h-1 w-full border-t-[0.125rem] dark:!border-t-[#FFFFFF14]', className)} />
		</div>
	);
};
