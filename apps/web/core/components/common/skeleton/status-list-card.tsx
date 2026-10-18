import Skeleton from 'react-loading-skeleton';

/**
 * One issue-settings section while it loads: the label column, the "create new" button, the list
 * heading and a row of chips.
 */
const SectionSkeleton = () => (
	<div className="grid grid-cols-1 gap-2 py-4 first:pt-0 last:pb-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
		<div className="sm:pt-2">
			<Skeleton width={120} height={14} borderRadius={6} className="dark:bg-muted" />
		</div>

		<div className="flex flex-col gap-3">
			<Skeleton width={180} height={36} borderRadius={8} className="dark:bg-muted" />
			<Skeleton width={100} height={12} borderRadius={6} className="dark:bg-muted" />
			<div className="flex flex-wrap gap-2">
				{[...Array(4)].map((_, i) => (
					<Skeleton key={i} width={144} height={36} borderRadius={8} className="dark:bg-muted" />
				))}
			</div>
		</div>
	</div>
);

const StatusListCard = () => {
	return (
		<div className="mt-6 flex w-full flex-col divide-y divide-border">
			<SectionSkeleton />
			<SectionSkeleton />
			<SectionSkeleton />
		</div>
	);
};

export default StatusListCard;
