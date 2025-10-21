'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/core/components/common/avatar';
import { Card } from '@/core/components/common/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/common/table';
import { Skeleton } from '@/core/components/common/skeleton';
import { useTranslations } from 'next-intl';
import {
	IActivityReport,
	IActivityReportGroupByDate,
	IActivityItem,
	IProjectWithActivity
} from '@/core/types/interfaces/activity/activity-report';
import React from 'react';
import { useProductivityApplicationTableConfig } from '@/core/hooks/organizations/employees/use-productivity-table-config';
import { useSortableData } from '@/core/hooks/common/use-sortable-data';
import { SortPopover } from '@/core/components/common/sort-popover';
import { usePagination } from '@/core/hooks/common/use-pagination';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import { format } from 'date-fns';
import { Paginate } from '@/core/components/duplicated-components/_pagination';
import { APP_NAME } from '@/core/constants/config/constants';

export function ProductivityApplicationTable({ data, isLoading }: { data?: IActivityReport[]; isLoading?: boolean }) {
	const reportData = data as IActivityReportGroupByDate[] | undefined;
	const { sortableColumns, tableColumns } = useProductivityApplicationTableConfig();

	const { items: sortedData, sortConfig, requestSort } = useSortableData(reportData || [], sortableColumns);
	const t = useTranslations();

	const { total, onPageChange, itemsPerPage, itemOffset, endOffset, setItemsPerPage, currentItems } =
		usePagination<IActivityReportGroupByDate>({ items: sortedData });

	if (isLoading) {
		return (
			<Card className="bg-white rounded-md border border-gray-100 dark:border-gray-700 dark:bg-dark--theme-light min-h-[600px]">
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
						{[...Array(7)].map((_, i) => (
							<TableRow key={i}>
								<TableCell>
									<Skeleton className="w-32 h-4" />
								</TableCell>
								<TableCell>
									<Skeleton className="w-24 h-4" />
								</TableCell>
								<TableCell>
									<Skeleton className="w-32 h-4" />
								</TableCell>
								<TableCell>
									<Skeleton className="w-24 h-4" />
								</TableCell>
								<TableCell>
									<Skeleton className="w-full h-4" />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</Card>
		);
	}

	if (!reportData || reportData.length === 0) {
		return (
			<Card className="grow w-full min-h-[600px] flex items-center justify-center flex-col">
				<AnimatedEmptyState
					title={t('common.NO_ACTIVITY_DATA')}
					message={t('common.SELECT_DIFFERENT_DATE')}
					showBorder={false}
					iconContainerSize="md"
					iconSize="lg"
				/>
			</Card>
		);
	}

	// Group activities by application
	const groupedByApp = currentItems.reduce(
		(apps, dayData) => {
			dayData.employees.forEach((employeeData) => {
				employeeData.projects.forEach((projectData: IProjectWithActivity) => {
					projectData.activity.forEach((activity: IActivityItem) => {
						if (!apps[activity.title]) {
							apps[activity.title] = [];
						}
						const projectName = projectData.project?.name || activity.project?.name || APP_NAME;
						apps[activity.title].push({
							date: dayData.date,
							activity,
							employee: activity.employee,
							projectName
						});
					});
				});
			});
			return apps;
		},
		{} as Record<string, Array<{ date: string; activity: IActivityItem; employee: any; projectName: string }>>
	);

	return (
		<Card className="bg-white rounded-md border border-gray-100 dark:border-gray-700 dark:bg-dark--theme-light min-h-[600px]">
			<Table>
				<TableHeader>
					<TableRow>
						{tableColumns.map((column) => (
							<TableHead key={column.key}>
								<SortPopover
									label={column.label}
									sortKey={column.key}
									currentConfig={sortConfig}
									onSort={requestSort}
								/>
							</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{Object.entries(groupedByApp).map(([appName, activities], index) => (
						<React.Fragment key={`${appName}-${index}`}>
							{/* Application Header */}
							<TableRow>
								<TableCell colSpan={5} className="px-6 py-4 font-medium bg-gray-50 dark:bg-gray-800">
									{appName}
								</TableCell>
							</TableRow>
							{/* Application Activities */}
							{activities.map(({ date, activity, employee, projectName }, index) => (
								<TableRow key={`${appName}-${date}-${index}`}>
									<TableCell>{format(new Date(date), 'EEEE dd MMM yyyy')}</TableCell>
									<TableCell>
										<div className="flex gap-2 items-center">
											<Avatar className="w-8 h-8">
												<AvatarImage src="/ever-teams-logo.svg" alt={APP_NAME} />
												<AvatarFallback>ET</AvatarFallback>
											</Avatar>
											<span>{projectName}</span>
										</div>
									</TableCell>
									<TableCell>
										<div className="flex gap-2 items-center">
											<Avatar className="w-8 h-8">
												{employee.user.imageUrl && (
													<AvatarImage src={employee.user.imageUrl} alt={employee.fullName} />
												)}
												<AvatarFallback>
													{employee.fullName
														.split(' ')
														.map((n: string) => n[0])
														.join('')
														.toUpperCase()}
												</AvatarFallback>
											</Avatar>
											<span>{employee.fullName}</span>
										</div>
									</TableCell>
									<TableCell>{formatDuration(activity.duration.toString())}</TableCell>
									<TableCell>
										<div className="flex gap-2 items-center">
											<div className="overflow-hidden w-full h-2 bg-gray-200 rounded-full">
												<div
													className="h-full bg-blue-500"
													style={{ width: `${activity.duration_percentage}%` }}
												/>
											</div>
											<span>{Math.round(parseFloat(activity.duration_percentage))}%</span>
										</div>
									</TableCell>
								</TableRow>
							))}
						</React.Fragment>
					))}
				</TableBody>
			</Table>
			<div className="p-2 mt-4">
				<Paginate
					total={total}
					onPageChange={onPageChange}
					pageCount={1}
					itemsPerPage={itemsPerPage}
					itemOffset={itemOffset}
					endOffset={endOffset}
					setItemsPerPage={setItemsPerPage}
					className="pt-0"
				/>
			</div>
		</Card>
	);
}

export function formatDuration(duration: string | number): string {
	const totalSeconds = typeof duration === 'string' ? parseInt(duration) : duration;
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
