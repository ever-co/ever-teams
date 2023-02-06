import { clsxm } from '@app/utils';

export function ProgressBar({
	width,
	progress,
	className,
}: {
	width: number | string;
	progress: number | string;
	className?: string;
}) {
	return (
		<div className={clsxm('flex relative', className)} style={{ width }}>
			<div
				className="bg-green-600 dark:bg-green-400 h-2 rounded-full absolute z-[1]"
				style={{ width: progress }}
			/>
			<div className="bg-[#F0F0F0] dark:bg-[#2B303B] h-2 rounded-full w-full  absolute z-[0]" />
		</div>
	);
}
