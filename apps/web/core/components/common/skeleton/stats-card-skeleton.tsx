import { Card } from '@/core/components/common/card';
import { clsxm } from '@/core/lib/utils';

interface StatSkeletonProps {
	showProgress?: boolean;
	progressColor?: string;
}

function StatCardSkeleton({ showProgress = false, progressColor = 'bg-gray-300' }: StatSkeletonProps) {
	return (
		<Card className={clsxm('rounded-xl px-4 py-3.5 shadow-none', 'overflow-hidden relative', 'animate-pulse')}>
			{/* Shimmer overlay */}
			<div
				className={clsxm(
					'absolute inset-0 -translate-x-full',
					'bg-gradient-to-r from-transparent to-transparent via-white/20 dark:via-white/10',
					'animate-[shimmer_2s_infinite]'
				)}
			/>

			<div className="flex relative z-10 flex-col">
				{/* Title skeleton */}
				<div className={clsxm('h-3 w-1/2 rounded', 'bg-gray-300 dark:bg-gray-600', 'mb-1')} />

				{/* Value skeleton */}
				<div className="mt-2 flex h-6 items-center">
					<div className={clsxm('h-5 w-16 rounded', 'bg-gray-400 dark:bg-gray-500')} />
				</div>

				{/* Progress bar skeleton */}
				{showProgress && (
					<div className="mt-1">
						<div
							className={clsxm(
								'h-1 w-full rounded-full bg-muted',
								'overflow-hidden relative'
							)}
						>
							{/* Animated progress bar skeleton */}
							<div
								className={clsxm(
									'h-full rounded-full',
									progressColor.concat('/30'),
									'animate-pulse',
									'w-1/3'
								)}
							/>

							{/* Moving shimmer on progress bar */}
							<div
								className={clsxm(
									'absolute inset-0 -translate-x-full',
									'bg-gradient-to-r from-transparent via-white/30 dark:via-white/20 to-transparent',
									'animate-[shimmer_1.5s_infinite]',
									'rounded-full'
								)}
							/>
						</div>
					</div>
				)}
			</div>
		</Card>
	);
}
export function StatsCardSkeleton() {
	const skeletonStats = [
		{ showProgress: false },
		{ showProgress: true, progressColor: 'bg-blue-300' },
		{ showProgress: true, progressColor: 'bg-red-300' },
		{ showProgress: true, progressColor: 'bg-yellow-300' },
		{ showProgress: false }
	];

	return (
		<div className="grid grid-cols-1 gap-4 min-w-fit sm:grid-cols-2 lg:grid-cols-5">
			{skeletonStats.map((stat, index) => (
				<StatCardSkeleton key={index} showProgress={stat.showProgress} progressColor={stat.progressColor} />
			))}
		</div>
	);
}
