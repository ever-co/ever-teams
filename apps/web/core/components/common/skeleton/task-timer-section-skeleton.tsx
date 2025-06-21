import TimerSkeleton from '@/core/components/common/skeleton/timer-skeleton';
import { EverCard } from '@/core/components/common/ever-card';
import { clsxm } from '@/core/lib/utils';
import { ChevronDown } from 'lucide-react';
import { AuthUserTaskInputSkeleton } from '../../common/skeleton/auth-user-task-input-skeleton';
import { useState } from 'react';

export function TaskTimerSectionSkeleton({ isTrackingEnabled }: Readonly<{ isTrackingEnabled: boolean }>) {
	const [showInput, setShowInput] = useState(false);

	return (
		<EverCard
			shadow="bigger"
			className={clsxm(
				'w-full flex lg:flex-row gap-4 lg:gap-4 xl:gap-6 max-w-full flex-col-reverse justify-center md:justify-between items-center py-4 mb-2',
				'border-[#00000008] border-[0.125rem] dark:border-[#26272C] dark:shadow-lg dark:bg-[#1B1D22] md:px-4',
				'animate-pulse'
			)}
		>
			{/* Task Input Skeleton Section */}
			<div
				className={clsxm(
					'w-full lg:basis-3/4 grow max-w-[72%]',
					!showInput && '!hidden md:!flex',
					!isTrackingEnabled && 'md:w-full',
					'transition-all duration-300 ease-in-out'
				)}
			>
				<AuthUserTaskInputSkeleton />
			</div>

			{/* Mobile Toggle Button Skeleton */}
			<div className="mt-2 w-full md:hidden">
				<div
					onClick={() => setShowInput((p) => !p)}
					className={clsxm(
						'border dark:border-[#26272C] w-full rounded p-2 flex justify-center items-center',
						'bg-gray-50 dark:bg-gray-800/30',
						'hover:bg-gray-100 dark:hover:bg-gray-700/30',
						'transition-all duration-200 ease-in-out cursor-pointer',
						'active:scale-95'
					)}
				>
					<ChevronDown
						className={clsxm(
							'h-6 w-6 transition-all duration-300 ease-in-out',
							'text-gray-500 dark:text-gray-400',
							showInput && 'rotate-180'
						)}
					/>

					{/* Hidden text for screen readers */}
					<span className="sr-only">{showInput ? 'hide the issue input' : 'show the issue input'}</span>
				</div>

				{/* Mobile button label skeleton */}
				<div className={clsxm('flex justify-center mt-2', 'animate-pulse')}>
					<div className={clsxm('w-32 h-3 rounded', 'bg-gray-300 dark:bg-gray-600')} />
				</div>
			</div>

			{/* Timer Skeleton Section */}
			{isTrackingEnabled ? (
				<div className={clsxm('w-full max-w-fit lg:basis-1/4 grow', 'transition-all duration-300 ease-in-out')}>
					<TimerSkeleton />
				</div>
			) : (
				/* Placeholder when tracking is disabled */
				<div
					className={clsxm(
						'w-full max-w-fit lg:basis-1/4 grow',
						'opacity-50 transition-all duration-300 ease-in-out'
					)}
				>
					<div
						className={clsxm(
							'w-full h-16 rounded-lg',
							'bg-gray-100 dark:bg-gray-800/50',
							'border border-gray-200 dark:border-gray-700',
							'animate-pulse',
							'flex justify-center items-center'
						)}
					>
						<div className={clsxm('w-20 h-4 rounded', 'bg-gray-300 dark:bg-gray-600')} />
					</div>
				</div>
			)}

			{/* Loading shimmer overlay */}
			<div
				className={clsxm(
					'absolute inset-0 -translate-x-full pointer-events-none',
					'bg-gradient-to-r from-transparent to-transparent via-white/10 dark:via-white/5',
					'animate-[shimmer_3s_infinite]',
					'rounded-lg'
				)}
			/>

			{/* Custom styles for shimmer animation */}
			<style jsx>{`
				@keyframes shimmer {
					0% {
						transform: translateX(-100%);
					}
					100% {
						transform: translateX(100%);
					}
				}
			`}</style>
		</EverCard>
	);
}
