import { clsxm } from '@/core/lib/utils';
import { VerticalSeparator } from '../../duplicated-components/separator';

export const TimerSkeleton = ({ className }: { className?: string }) => {
	return (
		<div
			className={clsxm(
				'flex justify-center items-center p-2 space-x-2 space-y-5 lg:flex-col xl:flex-row xl:space-y-0 min-w-[260px]',
				className
			)}
		>
			<div className="flex justify-center items-center pr-2 space-x-2 w-full xl:w-4/5">
				<div className="flex justify-between items-start w-full">
					<div className="mx-auto w-full">
						{/* Timer display */}
						<div className="w-[200px] h-12 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg" />

						{/* Timer status */}
						<div className="mt-2 w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>
				</div>
			</div>

			<VerticalSeparator />

			<div className="flex justify-center items-center w-1/4 xl:w-2/5 h-fit">
				{/* Timer button */}
				<div className="w-12 h-12 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
			</div>
		</div>
	);
};
