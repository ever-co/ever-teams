import { Skeleton } from '../skeleton';

/**
 * One issue-settings section while it loads: the label column, the "create new" button, the list
 * heading and a row of chips.
 */
const SectionSkeleton = () => (
	<div className="grid grid-cols-1 gap-2 py-4 first:pt-0 last:pb-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
		<div className="sm:pt-2">
			<Skeleton className="h-3.5 w-30" />
		</div>

		<div className="flex flex-col gap-3">
			<Skeleton className="h-9 w-45" />
			<Skeleton className="h-3 w-25" />
			<div className="flex flex-wrap gap-2">
				{[...Array(4)].map((_, i) => (
					<Skeleton key={i} className="h-9 w-36" />
				))}
			</div>
		</div>
	</div>
);

const StatusListCard = () => {
	return (
		<div className="mt-6 flex w-full flex-col hairline-divide-y divide-border">
			<SectionSkeleton />
			<SectionSkeleton />
			<SectionSkeleton />
		</div>
	);
};

export default StatusListCard;
