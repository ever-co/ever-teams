'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/core/components/common/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/common/table';
import { Skeleton } from '@/core/components/common/skeleton';
import { Card } from '@/core/components/common/card';
import { format, parseISO } from 'date-fns';
import {
	IActivityReport,
	IActivityReportGroupByDate,
	IActivityItem
} from '@/core/types/interfaces/activity/activity-report';
import React from 'react';
import { useTranslations } from 'next-intl';
import { useSortableData } from '@/core/hooks/common/use-sortable-data';
import { SortPopover } from '@/core/components/common/sort-popover';
import { useProductivityTableConfig } from '@/core/hooks/organizations/employees/use-productivity-table-config';
import { usePagination } from '@/core/hooks/common/use-pagination';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import { Paginate } from '@/core/components/duplicated-components/_pagination';

export function ProductivityTable({ data, isLoading }: { data?: IActivityReport[]; isLoading?: boolean }) {
	const reportData = data as IActivityReportGroupByDate[] | undefined;
	const t = useTranslations();
	const { sortableColumns, tableColumns } = useProductivityTableConfig();
	const { items: sortedData, sortConfig, requestSort } = useSortableData(reportData || [], sortableColumns);

	const { total, onPageChange, itemsPerPage, itemOffset, endOffset, setItemsPerPage, currentItems } =
		usePagination<IActivityReportGroupByDate>({ items: sortedData });

	const getProjectName = (activity: IActivityItem) => {
		return activity.project?.name || 'No project';
	};

	if (isLoading) {
		return (
			<Card className="min-h-[600px] overflow-hidden">
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
					noBg
				/>
			</Card>
		);
	}

	return (
		<Card className="min-h-[600px] overflow-hidden">
			<Table>
				<TableHeader className="bg-foreground/2.5">
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
											className="px-4 py-2.5 text-sm font-medium bg-foreground/2.5"
										>
											{format(parseISO(dayData.date), 'EEEE dd MMM yyyy')}
										</TableCell>
									</TableRow>
									<TableRow>
										<TableCell colSpan={5} className="py-4 text-center text-muted-foreground">
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
										className="px-4 py-2.5 text-sm font-medium bg-foreground/2.5"
									>
										{format(parseISO(dayData.date), 'EEEE dd MMM yyyy')}
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
											<TableCell className="tabular-nums">
												{formatDuration(activity.duration.toString())}
											</TableCell>
											<TableCell>
												<div className="flex gap-2 items-center">
													<div className="overflow-hidden w-full h-1.5 rounded-full bg-foreground/10">
														<div
															className="h-full rounded-full bg-primary"
															style={{ width: `${activity.duration_percentage}%` }}
														/>
													</div>
													<span className="w-10 text-right tabular-nums text-muted-foreground">
														{Math.round(Number.parseFloat(activity.duration_percentage))}%
													</span>
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
			<div className="hairline-t border-border px-4 py-3">
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
