import { FC } from 'react';
import { Card } from '@/core/components/common/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/common/table';
import { Skeleton } from '@/core/components/common/skeleton';

interface ProductivityTableSkeletonProps {
	className?: string;
}

export const ProductivityTableSkeleton: FC<ProductivityTableSkeletonProps> = ({ className }) => {
	return (
		<Card
			className={`bg-white rounded-md border border-gray-100 dark:border-gray-700 dark:bg-dark--theme-light min-h-[600px] ${className || ''}`}
		>
			<Table>
				<TableHeader className="bg-gray-50 dark:bg-dark--theme-light">
					<TableRow>
						<TableHead>
							<div className="flex gap-2 items-center">
								<Skeleton className="w-16 h-4" />
								<Skeleton className="w-4 h-4" />
							</div>
						</TableHead>
						<TableHead>
							<div className="flex gap-2 items-center">
								<Skeleton className="w-16 h-4" />
								<Skeleton className="w-4 h-4" />
							</div>
						</TableHead>
						<TableHead>
							<div className="flex gap-2 items-center">
								<Skeleton className="w-20 h-4" />
								<Skeleton className="w-4 h-4" />
							</div>
						</TableHead>
						<TableHead>
							<div className="flex gap-2 items-center">
								<Skeleton className="w-20 h-4" />
								<Skeleton className="w-4 h-4" />
							</div>
						</TableHead>
						<TableHead>
							<div className="flex gap-2 items-center">
								<Skeleton className="w-24 h-4" />
								<Skeleton className="w-4 h-4" />
							</div>
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{/* Date Groups */}
					{[1, 2, 3].map((groupIndex) => (
						<>
							{/* Date Header Row */}
							<TableRow key={`date-group-${groupIndex}`} className="bg-gray-50/30 dark:bg-gray-800">
								<TableCell colSpan={5} className="py-3">
									<div className="flex gap-3 items-center">
										<Skeleton className="w-40 h-5" />
										<Skeleton className="w-20 h-4" />
									</div>
								</TableCell>
							</TableRow>

							{/* Employee Activity Rows */}
							{[1, 2, 3, 4].map((activityIndex) => (
								<TableRow key={`activity-${groupIndex}-${activityIndex}`}>
									<TableCell>
										<div className="flex gap-2 items-center">
											<Skeleton className="w-8 h-8 rounded-full" />
											<Skeleton className="w-24 h-4" />
										</div>
									</TableCell>
									<TableCell>
										<div className="flex gap-2 items-center">
											<Skeleton className="w-8 h-8 rounded-full" />
											<Skeleton className="w-20 h-4" />
										</div>
									</TableCell>
									<TableCell>
										<Skeleton className="w-28 h-4" />
									</TableCell>
									<TableCell>
										<Skeleton className="w-16 h-4" />
									</TableCell>
									<TableCell>
										<div className="flex gap-2 items-center">
											<Skeleton className="w-16 h-2 rounded-full" />
											<Skeleton className="w-8 h-4" />
										</div>
									</TableCell>
								</TableRow>
							))}
						</>
					))}
				</TableBody>
			</Table>

			{/* Pagination Skeleton */}
			<div className="p-2 mt-4">
				<div className="flex justify-between items-center">
					<div className="flex gap-2 items-center">
						<Skeleton className="w-12 h-4" />
						<Skeleton className="w-16 h-8" />
						<Skeleton className="w-16 h-4" />
					</div>
					<div className="flex gap-2 items-center">
						<Skeleton className="w-20 h-8" />
						<Skeleton className="w-32 h-4" />
						<Skeleton className="w-20 h-8" />
					</div>
				</div>
			</div>
		</Card>
	);
};
