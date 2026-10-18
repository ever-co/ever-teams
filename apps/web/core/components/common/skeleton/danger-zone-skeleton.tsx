import Skeleton from 'react-loading-skeleton';

const DangerZoneRowSkeleton = () => (
	<div className="flex items-center justify-between gap-3 border-t border-border py-4 first:border-t-0 first:pt-0">
		<div className="flex flex-col gap-2">
			<Skeleton width={160} height={14} borderRadius={6} className="dark:bg-white/8" />
			<Skeleton width={320} height={12} borderRadius={6} className="dark:bg-white/8" />
		</div>
		<Skeleton width={110} height={36} borderRadius={8} className="dark:bg-white/8" />
	</div>
);

const DangerZoneSkeleton = () => {
	return (
		<div className="flex w-full flex-col">
			<DangerZoneRowSkeleton />
			<DangerZoneRowSkeleton />
			<DangerZoneRowSkeleton />
		</div>
	);
};

export default DangerZoneSkeleton;
