import { FC } from 'react';
import { Card } from '@/core/components/common/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/common/table';
import { Skeleton } from '@/core/components/common/skeleton';
import { useTranslations } from 'next-intl';

interface ProductivityApplicationTableSkeletonProps {
	className?: string;
}

export const ProductivityApplicationTableSkeleton: FC<ProductivityApplicationTableSkeletonProps> = ({ className }) => {
	const t = useTranslations();

	return (
		<Card className={`bg-white rounded-md border border-gray-100 dark:border-gray-700 dark:bg-dark--theme-light min-h-[600px] ${className || ''}`}>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>{t('common.DATE')}</TableHead>
						<TableHead>{t('sidebar.PROJECTS')}</TableHead>
						<TableHead>{t('common.MEMBER')}</TableHead>
						<TableHead>{t('common.TIME_SPENT')}</TableHead>
						<TableHead>{t('common.PERCENT_USED')}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{/* Application Groups */}
					{[1, 2, 3].map((appIndex) => (
						<>
							{/* Application Header Row */}
							<TableRow key={`app-header-${appIndex}`}>
								<TableCell colSpan={5} className="px-6 py-4 font-medium bg-gray-50 dark:bg-gray-800">
									<Skeleton className="w-40 h-5" />
								</TableCell>
							</TableRow>
							
							{/* Application Activity Rows */}
							{[1, 2, 3, 4, 5].map((activityIndex) => (
								<TableRow key={`app-activity-${appIndex}-${activityIndex}`}>
									<TableCell>
										<Skeleton className="w-40 h-4" />
									</TableCell>
									<TableCell>
										<div className="flex gap-2 items-center">
											<Skeleton className="w-8 h-8 rounded-full" />
											<Skeleton className="w-24 h-4" />
										</div>
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-2">
											<Skeleton className="w-8 h-8 rounded-full" />
											<Skeleton className="w-24 h-4" />
										</div>
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
