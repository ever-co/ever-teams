import { clsxm } from '@/core/lib/utils';
import { IClassName } from '@/core/types/interfaces/common/class-name';

export function AuthUserTaskInputSkeleton({ className }: IClassName) {
	return (
		<div className={clsxm('flex flex-col flex-1 mt-8 lg:mt-0', className)}>
			{/* Task Input Skeleton */}
			<div
				className={clsxm(
					'overflow-hidden relative rounded-lg border',
					'bg-gray-100 dark:bg-gray-800/50',
					'border-gray-200 dark:border-gray-700',
					'mb-4 h-12',
					'animate-pulse'
				)}
			>
				{/* Shimmer effect */}
				<div
					className={clsxm(
						'absolute inset-0 -translate-x-full',
						'bg-gradient-to-r from-transparent to-transparent via-white/20 dark:via-white/10',
						'animate-[shimmer_2s_infinite]'
					)}
				/>

				{/* Task number placeholder */}
				<div
					className={clsxm(
						'absolute left-3 top-1/2 -translate-y-1/2',
						'w-8 h-4 rounded',
						'bg-gray-300 dark:bg-gray-600'
					)}
				/>

				{/* Input text placeholder */}
				<div
					className={clsxm(
						'absolute left-14 top-1/2 -translate-y-1/2',
						'w-48 h-4 rounded',
						'bg-gray-300 dark:bg-gray-600'
					)}
				/>
			</div>

			<div className="flex flex-row gap-3 items-center ml-2 lg:gap-4 md:justify-between lg:justify-start">
				{/* Estimate Section Skeleton */}
				<div className="mb-4 xl:flex lg:mb-0">
					<div className={clsxm('flex gap-2 items-center', 'animate-pulse')}>
						{/* "ESTIMATE:" label */}
						<div className={clsxm('w-16 h-4 rounded', 'bg-gray-300 dark:bg-gray-600')} />
						{/* Estimate value */}
						<div
							className={clsxm(
								'w-12 h-6 rounded',
								'bg-gray-200 dark:bg-gray-700',
								'border border-gray-300 dark:border-gray-600'
							)}
						/>
					</div>
				</div>

				{/* Desktop Controls Skeleton */}
				<div className="hidden flex-1 gap-2 justify-end md:flex md:items-center">
					{/* Status Dropdown Skeleton */}
					<div
						className={clsxm(
							'overflow-hidden relative',
							'h-8 w-fit lg:max-w-[190px] min-w-[120px]',
							'rounded border',
							'bg-gray-100 dark:bg-gray-800/50',
							'border-gray-200 dark:border-gray-700',
							'animate-pulse'
						)}
					>
						<div
							className={clsxm(
								'absolute inset-0 -translate-x-full',
								'bg-gradient-to-r from-transparent to-transparent via-white/20 dark:via-white/10',
								'animate-[shimmer_2s_infinite]'
							)}
						/>
						<div
							className={clsxm(
								'absolute left-2 top-1/2 -translate-y-1/2',
								'w-16 h-3 rounded',
								'bg-gray-300 dark:bg-gray-600'
							)}
						/>
						<div
							className={clsxm(
								'absolute right-2 top-1/2 -translate-y-1/2',
								'w-3 h-3 rounded',
								'bg-gray-300 dark:bg-gray-600'
							)}
						/>
					</div>

					{/* Properties Dropdown Skeleton */}
					<div
						className={clsxm(
							'overflow-hidden relative',
							'h-8 w-fit lg:max-w-[190px] min-w-[120px]',
							'rounded border',
							'bg-gray-100 dark:bg-gray-800/50',
							'border-gray-200 dark:border-gray-700',
							'animate-pulse'
						)}
					>
						<div
							className={clsxm(
								'absolute inset-0 -translate-x-full',
								'bg-gradient-to-r from-transparent to-transparent via-white/20 dark:via-white/10',
								'animate-[shimmer_2s_infinite]'
							)}
						/>
						<div
							className={clsxm(
								'absolute left-2 top-1/2 -translate-y-1/2',
								'w-20 h-3 rounded',
								'bg-gray-300 dark:bg-gray-600'
							)}
						/>
					</div>

					{/* Sizes Dropdown Skeleton */}
					<div
						className={clsxm(
							'overflow-hidden relative',
							'h-8 w-fit lg:max-w-[190px] min-w-[100px]',
							'rounded border',
							'bg-gray-100 dark:bg-gray-800/50',
							'border-gray-200 dark:border-gray-700',
							'animate-pulse'
						)}
					>
						<div
							className={clsxm(
								'absolute inset-0 -translate-x-full',
								'bg-gradient-to-r from-transparent to-transparent via-white/20 dark:via-white/10',
								'animate-[shimmer_2s_infinite]'
							)}
						/>
						<div
							className={clsxm(
								'absolute left-2 top-1/2 -translate-y-1/2',
								'w-8 h-3 rounded',
								'bg-gray-300 dark:bg-gray-600'
							)}
						/>
					</div>

					{/* Task Labels Skeleton */}
					<div
						className={clsxm(
							'overflow-hidden relative',
							'h-8 w-fit lg:max-w-[170px] min-w-[80px]',
							'rounded border',
							'bg-gray-100 dark:bg-gray-800/50',
							'border-gray-200 dark:border-gray-700',
							'animate-pulse'
						)}
					>
						<div
							className={clsxm(
								'absolute inset-0 -translate-x-full',
								'bg-gradient-to-r from-transparent to-transparent via-white/20 dark:via-white/10',
								'animate-[shimmer_2s_infinite]'
							)}
						/>
						<div className="flex absolute left-2 top-1/2 gap-1 items-center -translate-y-1/2">
							<div className={clsxm('w-4 h-4 rounded-full', 'bg-gray-300 dark:bg-gray-600')} />
							<div className={clsxm('w-4 h-4 rounded-full', 'bg-gray-300 dark:bg-gray-600')} />
						</div>
					</div>

					{/* Project Dropdown Skeleton */}
					<div
						className={clsxm(
							'overflow-hidden relative',
							'h-8 w-fit max-w-[140px] min-w-[90px]',
							'rounded-xl border',
							'bg-gray-100 dark:bg-gray-800/50',
							'border-gray-200 dark:border-gray-700',
							'animate-pulse'
						)}
					>
						<div
							className={clsxm(
								'absolute inset-0 -translate-x-full',
								'bg-gradient-to-r from-transparent to-transparent via-white/20 dark:via-white/10',
								'animate-[shimmer_2s_infinite]'
							)}
						/>
						<div
							className={clsxm(
								'absolute left-2 top-1/2 -translate-y-1/2',
								'w-12 h-3 rounded',
								'bg-gray-300 dark:bg-gray-600'
							)}
						/>
					</div>
				</div>
			</div>

			{/* Custom shimmer keyframes - Add this to your global CSS or Tailwind config */}
			<style jsx>{`
				@keyframes shimmer {
					100% {
						transform: translateX(100%);
					}
				}
			`}</style>
		</div>
	);
}
