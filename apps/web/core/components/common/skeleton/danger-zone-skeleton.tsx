import { Skeleton } from '../skeleton';

const DangerZoneRowSkeleton = () => (
	<div className="flex items-center justify-between gap-3 hairline-t border-border py-4 first:border-t-0 first:pt-0">
		<div className="flex flex-col gap-2">
			<Skeleton className="h-3.5 w-40" />
			<Skeleton className="h-3 w-80" />
		</div>
		<Skeleton className="h-9 w-[110px]" />
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
