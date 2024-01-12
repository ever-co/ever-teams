import { clsxm } from '@app/utils';

const Skeleton = ({
	height,
	width,
	borderRadius,
	className
}: {
	height: number;
	width: number;
	borderRadius: number;
	className: string;
}) => {
	return (
		<div
			className={clsxm(
				'p-1  animate-pulse rounded-lg bg-[#F0F0F0] dark:bg-[#353741]',
				height ? `h-[${height}px]` : 'h-[20px]',
				width ? `w-[${width}px]` : 'w-[160px]',
				className
			)}
		/>
	);
};

export default Skeleton;
