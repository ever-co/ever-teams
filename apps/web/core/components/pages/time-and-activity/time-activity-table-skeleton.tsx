import { FC } from 'react';
import { Card } from '@/core/components/common/card';
import { Skeleton } from '@/core/components/common/skeleton';

export const TimeActivityTableSkeleton: FC = () => {
	return (
		<div className="space-y-6">
			{[1, 2].map((groupIndex) => (
				<Card key={groupIndex} className="overflow-hidden">
					<div className="px-4 py-3 hairline-b border-border bg-foreground/2.5">
						<div className="flex items-center gap-4">
							<Skeleton className="h-5 w-48" />
							<Skeleton className="h-5 w-32" />
							<Skeleton className="h-5 w-32" />
							<Skeleton className="h-5 w-32" />
						</div>
					</div>

					<div className="hairline-divide-y divide-border">
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
