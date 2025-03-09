import { clsxm } from '@app/utils';

export function ProgressBar({
	width,
	progress,
	className,
	showPercents,
	backgroundColor
}: {
	width: number | string;
	progress: number | string;
	className?: string;
	showPercents?: boolean;
	backgroundColor?: string;
}) {
	return (
		<>
			<div className={clsxm('flex justify-between items-center relative', className)} style={{ width }}>
				<div
					className={clsxm(
						' h-2 rounded-full absolute z-[1] bg-black ',
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
				<div style={{ backgroundColor }} className="bg-[#dfdfdf] dark:bg-[#2B303B] h-2 rounded-full w-full" />
			</div>
			{showPercents && (
				<div className="not-italic font-medium text-[0.625rem] leading-[140%] tracking-[-0.02em] ml-2 text-[#28204880] dark:text-white">
					{progress}
				</div>
			)}
		</>
	);
}

export function SegmentedProgressBar({
	width,
	progress,
	className,
	showPercents,
	totalSegments = 30
}: {
	width: number | string;
	progress: number | string;
	className?: string;
	showPercents?: boolean;
	totalSegments?: number;
}) {
	const progressValue = parseFloat(progress.toString());
	const activeSegments = Math.round((progressValue / 100) * totalSegments);

	// Determine color based on total progress percentage
	const getColor = (progress: number) => {
		if (progress < 25) return 'bg-red-600 dark:bg-red-400';
		if (progress >= 25 && progress < 50) return 'bg-yellow-600 dark:bg-yellow-400';
		if (progress >= 50 && progress < 75) return 'bg-blue-600 dark:bg-blue-400';
		return 'bg-green-600 dark:bg-green-400';
	};

	return (
		<>
			<div className={clsxm('flex items-center gap-[2px] relative !m-0', className)} style={{ width }}>
				{Array.from({ length: totalSegments }).map((_, index) => (
					<div
						key={index}
						className={clsxm(
							'h-2 rounded-sm w-[.3rem]',
							index < activeSegments ? getColor(progressValue) : 'bg-[#dfdfdf] dark:bg-[#2B303B]'
						)}
					/>
				))}
			</div>

			{showPercents && (
				<div className="not-italic font-medium text-[0.625rem] leading-[140%] tracking-[-0.02em] ml-2 text-[#28204880] dark:text-white">
					{progress}
				</div>
			)}
		</>
	);
}
