import { clsxm } from '@/core/lib/utils';

const TeamNotificationsSkeleton = ({ className }: { className?: string }) => {
	return (
		<div className={clsxm('flex flex-col gap-1', className)}>
			{/* Outstanding notification skeleton */}
			<div className="flex justify-between items-center px-4 py-2.5 mb-2 text-xs rounded-xl border dark:border-dark--theme-light">
				<div className="flex-1">
					<div className="w-64 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mb-2" />
					<div className="w-32 h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>
				<div className="flex items-center gap-2">
					<div className="w-16 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-4 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>
			</div>
		</div>
	);
};

export default TeamNotificationsSkeleton;
