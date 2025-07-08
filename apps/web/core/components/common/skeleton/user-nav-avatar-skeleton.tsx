import { clsxm } from '@/core/lib/utils';

interface UserNavAvatarSkeletonProps {
	className?: string;
}

export function UserNavAvatarSkeleton({ className }: UserNavAvatarSkeletonProps) {
	return (
		<div className={clsxm('relative', className)}>
			{/* Avatar skeleton with timer status */}
			<div className="relative">
				<div className="w-[3rem] h-[3rem] bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full border-[0.25rem] border-transparent dark:border-[#26272C]" />
				
				{/* Timer status skeleton */}
				<div className="w-[1.3rem] h-[1.3rem] bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full absolute bottom-3 -right-2 -mb-4 border-[0.125rem] border-white dark:border-[#26272C]" />
			</div>
		</div>
	);
}
