import { Skeleton } from '../skeleton';

export function ActivityCalendarSkeleton() {
	const { innerWidth: deviceWith } = window;

	const skeletons = Array.from(Array(12));

	return (
		<div className="flex overflow-hidden justify-around items-center w-full h-32">
			{skeletons.map((_, index) => (
				<Skeleton
					key={index}
					style={{ width: (deviceWith - (deviceWith * 10) / 100) / 12 }}
					className="h-32 dark:bg-gray-700"
				/>
			))}
		</div>
	);
}
