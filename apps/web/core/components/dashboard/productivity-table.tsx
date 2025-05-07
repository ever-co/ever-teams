'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/core/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/ui/table';
import { Skeleton } from '@/core/components/ui/skeleton';
import { Card } from '@/core/components/ui/card';
import { format } from 'date-fns';
import {
	IActivityReport,
	IActivityReportGroupByDate,
	IActivityItem
} from '@/core/types/interfaces/activity/IActivityReport';
import React from 'react';
import { useTranslations } from 'next-intl';
import { useSortableData } from '@/core/hooks/common/use-sortable-data';
import { SortPopover } from '@/core/components/ui/sort-popover';
import { useProductivityTableConfig } from '@/core/hooks/organizations/employees/use-productivity-table-config';
import { Paginate } from '@/core/components';
import { usePagination } from '@/core/hooks/common/use-pagination';
import { AnimatedEmptyState } from '@/core/components/ui/empty-state';

export function ProductivityTable({ data, isLoading }: { data?: IActivityReport[]; isLoading?: boolean }) {
	const reportData = data as IActivityReportGroupByDate[] | undefined;
	const t = useTranslations();
	const { sortableColumns, tableColumns } = useProductivityTableConfig();
	const { items: sortedData, sortConfig, requestSort } = useSortableData(reportData || [], sortableColumns);

	const { total, onPageChange, itemsPerPage, itemOffset, endOffset, setItemsPerPage, currentItems } =
		usePagination<IActivityReportGroupByDate>(sortedData);

	const getProjectName = (activity: IActivityItem) => {
		return activity.project?.name || 'No project';
	};

	if (isLoading) {
		return (
			<Card className="bg-white rounded-md border border-gray-100 dark:border-gray-700 dark:bg-dark--theme-light min-h-[600px]">
				<Table>
					<TableHeader>
						<TableRow>
							{tableColumns.map((column) => (
								<TableHead key={column.key}>{column.label}</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{[...Array(7)].map((_, i) => (
							<TableRow key={i}>
								<TableCell>
									<div className="flex gap-2 items-center">
										<Skeleton className="w-8 h-8 rounded-full" />
										<Skeleton className="w-24 h-4" />
									</div>
								</TableCell>
								<TableCell>
									<Skeleton className="w-24 h-4" />
								</TableCell>
								<TableCell>
									<Skeleton className="w-16 h-4" />
								</TableCell>
								<TableCell>
									<Skeleton className="w-16 h-4" />
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
			<Card className="grow w-full min-h-[600px]">
				<AnimatedEmptyState
					title={t('common.NO_ACTIVITY_DATA')}
					message={t('common.SELECT_DIFFERENT_DATE')}
					showBorder={false}
				/>
			</Card>
		);
	}

	return (
		<Card className="bg-white rounded-md border border-gray-100 dark:border-gray-700 dark:bg-dark--theme-light min-h-[600px]">
			<Table>
				<TableHeader className="bg-gray-50 dark:bg-dark--theme-light">
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
					{currentItems.map((dayData) => {
						const employeeActivities = new Map<string, { employee: any; activities: IActivityItem[] }>();
						dayData.employees.forEach((employeeData) => {
							employeeData.projects[0]?.activity.forEach((activity: IActivityItem) => {
								const employeeId = activity.employee.id;
								if (!employeeActivities.has(employeeId)) {
									employeeActivities.set(employeeId, {
										employee: activity.employee,
										activities: []
									});
								}
								employeeActivities.get(employeeId)?.activities.push(activity);
							});
						});

						const hasActivities = Array.from(employeeActivities.values()).some(
							({ activities }) => activities.length > 0
						);

						if (!hasActivities) {
							return (
								<React.Fragment key={dayData.date}>
									<TableRow>
										<TableCell
											colSpan={5}
											className="px-6 py-4 font-medium bg-gray-50 dark:bg-gray-800"
										>
											{format(new Date(dayData.date), 'EEEE dd MMM yyyy')}
										</TableCell>
									</TableRow>
									<TableRow>
										<TableCell
											colSpan={5}
											className="py-4 text-center text-gray-500 dark:text-gray-400"
										>
											No activities recorded for this day
										</TableCell>
									</TableRow>
								</React.Fragment>
							);
						}

						return (
							<React.Fragment key={dayData.date}>
								<TableRow>
									<TableCell
										colSpan={5}
										className="px-6 py-4 font-medium bg-gray-50 dark:bg-gray-800"
									>
										{format(new Date(dayData.date), 'EEEE dd MMM yyyy')}
									</TableCell>
								</TableRow>
								{Array.from(employeeActivities.values()).map(({ employee, activities }) =>
									activities.map((activity, index) => (
										<TableRow key={`${employee.id}-${index}`}>
											{index === 0 && (
												<TableCell className="align-top" rowSpan={activities.length}>
													<div className="flex gap-2 items-center">
														<Avatar className="w-8 h-8">
															{employee.user.imageUrl && (
																<AvatarImage
																	src={employee.user.imageUrl}
																	alt={employee.fullName}
																/>
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
											)}
											<TableCell>{getProjectName(activity)}</TableCell>
											<TableCell>{activity.title}</TableCell>
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
									))
								)}
							</React.Fragment>
						);
					})}
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

function formatDuration(seconds: string): string {
	const totalSeconds = parseInt(seconds);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const remainingSeconds = totalSeconds % 60;

	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}
