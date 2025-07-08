import { clsxm } from '@/core/lib/utils';

interface TeamsDropDownSkeletonProps {
	className?: string;
}

export function TeamsDropDownSkeleton({ className }: TeamsDropDownSkeletonProps) {
	return (
		<div className={clsxm('min-w-fit md:max-w-[223px]', className)}>
			{/* Dropdown button skeleton */}
			<div className="py-2 px-3 font-medium outline-none dark:bg-[#1B1D22] dark:border-[0.125rem] border-[#0000001A] dark:border-[#26272C] rounded-md">
				<div className="h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>
		</div>
	);
}
