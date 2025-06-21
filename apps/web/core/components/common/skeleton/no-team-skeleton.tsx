import { clsxm } from '@/core/lib/utils';

interface NoTeamSkeletonProps {
	className?: string;
	fullWidth?: boolean;
}

export function NoTeamSkeleton({ className, fullWidth = true }: NoTeamSkeletonProps) {
	return (
		<div
			className={clsxm(
				'flex flex-col items-center justify-center min-h-[400px] p-8',
				className,
				fullWidth && 'w-full'
			)}
		>
			{/* Icon skeleton */}
			<div className="w-24 h-24 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full mb-6" />

			{/* Title skeleton */}
			<div className="w-64 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mb-4" />

			{/* Description skeleton */}
			<div className="w-96 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mb-2" />
			<div className="w-80 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mb-6" />

			{/* Button skeleton */}
			<div className="w-40 h-12 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-lg" />
		</div>
	);
}
