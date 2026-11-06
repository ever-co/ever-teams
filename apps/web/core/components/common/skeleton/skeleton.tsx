import { clsxm } from '@/core/lib/utils';

function toPixels(value: number) {
	if (!value) {
		return undefined;
	}
	return `${value}px`;
}

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
	const style = {
		borderRadius,
		height: toPixels(height),
		width: toPixels(width)
	};

	return (
		<div
			className={clsxm(
				'p-1  animate-pulse rounded-lg bg-foreground/5',
				!height && 'h-[20px]',
				!width && 'w-[160px]',
				className
			)}
			style={style}
		/>
	);
};

export default Skeleton;
