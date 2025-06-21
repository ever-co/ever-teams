import { clsxm } from '@/core/lib/utils';

interface CollaborateSkeletonProps {
	className?: string;
}

export function CollaborateSkeleton({ className }: CollaborateSkeletonProps) {
	return (
		<div className={clsxm('', className)}>
			{/* Collaborate button skeleton */}
			<div className="flex flex-row items-center justify-center py-3 text-xs px-4 gap-2 h-fit rounded-lg bg-[#F0F0F0] dark:bg-[#353741] animate-pulse">
				<div className="w-4 h-4 bg-[#E0E0E0] dark:bg-[#2A2B32] animate-pulse rounded" />
				<div className="w-20 h-4 bg-[#E0E0E0] dark:bg-[#2A2B32] animate-pulse rounded" />
			</div>
		</div>
	);
}
