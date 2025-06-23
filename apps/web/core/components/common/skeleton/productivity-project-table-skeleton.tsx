import { FC } from 'react';
import { Card } from '@/core/components/common/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/common/table';
import { Skeleton } from '@/core/components/common/skeleton';
import { useTranslations } from 'next-intl';

interface ProductivityProjectTableSkeletonProps {
	className?: string;
}

export const ProductivityProjectTableSkeleton: FC<ProductivityProjectTableSkeletonProps> = ({ className }) => {
	const t = useTranslations();

	return (
		<Card className={`bg-white rounded-md border border-gray-100 dark:border-gray-800 dark:bg-dark--theme-light min-h-[600px] w-full ${className || ''}`}>
			<Table>
				<TableHeader className="bg-gray-50 dark:bg-dark--theme-light">
					<TableRow>
						<TableHead className="font-semibold">{t('common.DATE')}</TableHead>
						<TableHead className="font-semibold">{t('common.MEMBER')}</TableHead>
						<TableHead className="font-semibold">{t('common.APPLICATION')}</TableHead>
						<TableHead className="font-semibold">{t('common.TIME_SPENT')}</TableHead>
						<TableHead className="font-semibold">{t('common.PERCENT_USED')}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{/* Project Groups */}
					{[1, 2].map((projectIndex) => (
						<>
							{/* Project Header Row */}
							<TableRow key={`project-header-${projectIndex}`} className="bg-gray-50/50 dark:bg-gray-800">
								<TableCell colSpan={5} className="py-2">
									<div className="flex items-center gap-2">
										<Skeleton className="w-6 h-6 rounded-full" />
										<Skeleton className="w-32 h-4" />
									</div>
								</TableCell>
							</TableRow>
							
							{/* Date Groups within Project */}
							{[1, 2].map((dateIndex) => (
								<>
									{/* Date Header Row */}
									<TableRow key={`date-header-${projectIndex}-${dateIndex}`} className="bg-gray-50/30 dark:bg-gray-800">
										<TableCell>
											<Skeleton className="w-40 h-4" />
										</TableCell>
										<TableCell colSpan={4}>
											<div className="flex items-center gap-2 text-sm">
												<Skeleton className="w-16 h-3" />
												<Skeleton className="w-16 h-3" />
											</div>
										</TableCell>
									</TableRow>
									
									{/* Activity Rows */}
									{[1, 2, 3].map((activityIndex) => (
										<TableRow key={`activity-${projectIndex}-${dateIndex}-${activityIndex}`}>
											<TableCell>
												<Skeleton className="w-32 h-4" />
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-2">
													<Skeleton className="w-8 h-8 rounded-full" />
													<Skeleton className="w-24 h-4" />
												</div>
											</TableCell>
											<TableCell>
												<Skeleton className="w-28 h-4" />
											</TableCell>
											<TableCell>
												<Skeleton className="w-16 h-4" />
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-2">
													<Skeleton className="w-12 h-2 rounded-full" />
													<Skeleton className="w-8 h-4" />
												</div>
											</TableCell>
										</TableRow>
									))}
								</>
							))}
						</>
					))}
				</TableBody>
			</Table>
			
			{/* Pagination Skeleton */}
			<div className="p-2 mt-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Skeleton className="w-12 h-4" />
						<Skeleton className="w-16 h-8" />
						<Skeleton className="w-16 h-4" />
					</div>
					<div className="flex items-center gap-2">
						<Skeleton className="w-20 h-8" />
						<Skeleton className="w-32 h-4" />
						<Skeleton className="w-20 h-8" />
					</div>
				</div>
			</div>
		</Card>
	);
};
