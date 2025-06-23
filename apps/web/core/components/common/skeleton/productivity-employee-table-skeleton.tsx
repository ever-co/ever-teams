import { FC } from 'react';
import { Card } from '@/core/components/common/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/common/table';
import { Skeleton } from '@/core/components/common/skeleton';
import { useTranslations } from 'next-intl';

interface ProductivityEmployeeTableSkeletonProps {
	className?: string;
}

export const ProductivityEmployeeTableSkeleton: FC<ProductivityEmployeeTableSkeletonProps> = ({ className }) => {
	const t = useTranslations();

	return (
		<Card className={`bg-white rounded-md border border-gray-100 dark:border-gray-700 dark:bg-dark--theme-light min-h-[600px] ${className || ''}`}>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>{t('common.MEMBER')}</TableHead>
						<TableHead>{t('sidebar.PROJECTS')}</TableHead>
						<TableHead>{t('common.APPLICATION')}</TableHead>
						<TableHead>{t('common.TIME_SPENT')}</TableHead>
						<TableHead>{t('common.PERCENT_USED')}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{/* Employee Groups */}
					{[1, 2, 3].map((employeeIndex) => (
						<>
							{/* Employee Header Row */}
							<TableRow key={`employee-header-${employeeIndex}`} className="bg-gray-50/50 dark:bg-gray-800">
								<TableCell colSpan={5} className="py-3">
									<div className="flex items-center gap-3">
										<Skeleton className="w-10 h-10 rounded-full" />
										<div className="flex flex-col gap-1">
											<Skeleton className="w-32 h-4" />
											<div className="flex items-center gap-2">
												<Skeleton className="w-16 h-3" />
												<span className="text-gray-400">•</span>
												<Skeleton className="w-20 h-3" />
											</div>
										</div>
									</div>
								</TableCell>
							</TableRow>
							
							{/* Employee Activity Rows */}
							{[1, 2, 3, 4].map((activityIndex) => (
								<TableRow key={`employee-activity-${employeeIndex}-${activityIndex}`}>
									<TableCell>
										<div className="flex items-center gap-2 pl-6">
											<Skeleton className="w-24 h-4" />
										</div>
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-2">
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
										<div className="flex items-center gap-2">
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
