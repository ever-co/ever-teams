import { FC } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const TimeActivityTableSkeleton: FC = () => {
	return (
		<div className="space-y-6">
			{[1, 2].map((groupIndex) => (
				<Card key={groupIndex} className="bg-white dark:bg-dark--theme-light">
					<div className="p-4 border-b border-gray-200 dark:border-gray-700">
						<div className="flex items-center gap-4">
							<Skeleton className="h-5 w-48" />
							<Skeleton className="h-5 w-32" />
							<Skeleton className="h-5 w-32" />
							<Skeleton className="h-5 w-32" />
						</div>
					</div>

					<div className="divide-y divide-gray-200 dark:divide-gray-700">
						{[1, 2, 3, 4, 5].map((entryIndex) => (
							<div key={entryIndex} className="p-4 flex items-center justify-between">
								<div className="flex items-center gap-3 w-48">
									<Skeleton className="w-8 h-8 rounded-full" />
									<Skeleton className="h-5 w-24" />
								</div>

								<div className="flex items-center gap-3 w-48">
									<Skeleton className="w-8 h-8 rounded-full" />
									<Skeleton className="h-5 w-24" />
								</div>

								<div className="w-32">
									<Skeleton className="h-5 w-20 ml-auto" />
								</div>

								<div className="w-32">
									<Skeleton className="h-5 w-20 ml-auto" />
								</div>

								<div className="flex items-center gap-3 w-48">
									<Skeleton className="h-2 w-24" />
									<Skeleton className="h-5 w-8" />
								</div>
							</div>
						))}
					</div>
				</Card>
			))}
		</div>
	);
};
