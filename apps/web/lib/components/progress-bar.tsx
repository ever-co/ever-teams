import { clsxm } from '@app/utils';

export function ProgressBar({
	width,
	progress,
	className,
	showPercents
}: {
	width: number | string;
	progress: number | string;
	className?: string;
	showPercents?: boolean;
}) {
	return (
		<>
			<div className={clsxm('flex justify-between items-center relative', className)} style={{ width }}>
				<div
					className={clsxm(
						' h-2 rounded-full absolute z-[1] ',
						+parseInt(progress.toString()) < 25 && 'bg-red-600 dark:bg-red-400',
						+parseInt(progress.toString()) >= 25 &&
							+parseInt(progress.toString()) < 50 &&
							'bg-yellow-600 dark:bg-yellow-400',
						+parseInt(progress.toString()) >= 50 &&
							+parseInt(progress.toString()) < 75 &&
							'bg-blue-600 dark:bg-blue-400',
						+parseInt(progress.toString()) >= 75 && 'bg-green-600 dark:bg-green-400'
					)}
					style={{ width: progress }}
				/>
				<div className="bg-[#dfdfdf] dark:bg-[#2B303B] h-2 rounded-full w-full  absolute z-[0]" />
			</div>
			{showPercents && (
				<div className="not-italic font-medium text-[0.625rem] leading-[140%] tracking-[-0.02em] ml-2 text-[#28204880] dark:text-white">
					{progress}
				</div>
			)}
		</>
	);
}
