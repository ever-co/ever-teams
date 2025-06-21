import { clsxm } from '@/core/lib/utils';
import { VerticalSeparator } from '../../duplicated-components/separator';

const TimerSkeleton = ({ className }: { className?: string }) => {
	return (
		<div
			className={clsxm(
				'flex space-x-2 lg:flex-col xl:flex-row justify-center items-center p-2 xl:space-y-0 space-y-5 min-w-[260px]',
				className
			)}
		>
			<div className="flex items-center justify-center w-full pr-2 space-x-2 xl:w-4/5">
				<div className="flex items-start justify-between w-full">
					<div className="w-full mx-auto">
						{/* Timer display */}
						<div className="w-[200px] h-12 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg" />

						{/* Timer status */}
						<div className="mt-2 w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>
				</div>
			</div>

			<VerticalSeparator />

			<div className="flex items-center justify-center w-1/4 xl:w-2/5 h-fit">
				{/* Timer button */}
				<div className="w-12 h-12 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
			</div>
		</div>
	);
};

export default TimerSkeleton;
