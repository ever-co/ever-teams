'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/core/components/common/avatar';
import { Button } from '@/core/components/duplicated-components/_button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/common/table';
import { format } from 'date-fns';
import { Fragment, useState } from 'react';
import { SortPopover } from '@/core/components/common/sort-popover';
import { ChartIcon } from '../../../common/team-icon';
// Import optimized components from centralized location
import { LazyActivityModal } from '@/core/components/optimized-components/dashboard';
import { LazyAnimatedEmptyState } from '@/core/components/optimized-components/common';
import { Suspense } from 'react';
import { ModalSkeleton } from '@/core/components/common/skeleton/modal-skeleton';
import { useModal, usePagination } from '@/core/hooks';
import { useTranslations } from 'next-intl';
import { useSortableData } from '@/core/hooks/common/use-sortable-data';
import { Skeleton } from '@/core/components/common/skeleton';
import { Card } from '@/core/components/common/card';
import { ITimerEmployeeLog, ITimeLogGroupedDailyReport } from '@/core/types/interfaces/activity/activity-report';
import { Paginate } from '@/core/components/duplicated-components/_pagination';

const getProgressColor = (activityLevel: number) => {
	if (isNaN(activityLevel) || activityLevel < 0) return 'bg-gray-300';
	if (activityLevel > 100) return 'bg-green-500';
	if (activityLevel <= 20) return 'bg-red-500';
	if (activityLevel <= 50) return 'bg-yellow-500';
	return 'bg-green-500';
};

const formatDuration = (duration: number) => {
	const hours = Math.floor(duration / 3600);
	const minutes = Math.floor((duration % 3600) / 60);
	const seconds = duration % 60;

	const pad = (num: number) => num.toString().padStart(2, '0');

	return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

const formatPercentage = (value: number) => {
	return `${Math.round(value)}%`;
};

export function TeamStatsTable({
	rapportDailyActivity,
	isLoading
}: {
	rapportDailyActivity?: ITimeLogGroupedDailyReport[];
	isLoading?: boolean;
}) {
	const t = useTranslations();
	const [employeeLog, setEmployeeLog] = useState<ITimerEmployeeLog | undefined>(undefined);

	const { openModal, closeModal, isOpen } = useModal();

	const getEmployeeLog = (data: ITimeLogGroupedDailyReport): ITimerEmployeeLog | undefined => {
		return data?.logs?.[0]?.employeeLogs?.[0];
	};

	const getTaskDurationByType = (employeeLog: ITimerEmployeeLog | undefined, type: string): number => {
		if (!employeeLog?.tasks) return 0;
		return (
			employeeLog?.tasks.reduce(
				(sum: number, task: any) => (task.description.toLowerCase().includes(type) ? sum + task.duration : sum),
				0
			) || 0
		);
	};

	const getTotalTime = (data: ITimeLogGroupedDailyReport): number => {
		if (!data?.logs) return 0;
		return data.logs.reduce(
			(sum, log) => sum + log.employeeLogs.reduce((empSum, empLog) => empSum + empLog.sum, 0),
			0
		);
	};

	const sortableColumns = {
		member: {
			getValue: (data: ITimeLogGroupedDailyReport) =>
				getEmployeeLog(data)?.employee?.fullName?.toLowerCase() || '',
			compare: (a: string, b: string) => a.localeCompare(b)
		},
		totalTime: {
			getValue: getTotalTime,
			compare: (a: number, b: number) => a - b
		},
		tracked: {
			getValue: (data: ITimeLogGroupedDailyReport) =>
				getEmployeeLog(data)?.tasks.reduce((sum, task) => sum + task.duration, 0) || 0,
			compare: (a: number, b: number) => a - b
		},
		manual: {
			getValue: (data: ITimeLogGroupedDailyReport) => getTaskDurationByType(getEmployeeLog(data), 'manual'),
			compare: (a: number, b: number) => a - b
		},
		activeTime: {
			getValue: (data: ITimeLogGroupedDailyReport) => getTaskDurationByType(getEmployeeLog(data), 'active'),
			compare: (a: number, b: number) => a - b
		},
		idleTime: {
			getValue: (data: ITimeLogGroupedDailyReport) => getTaskDurationByType(getEmployeeLog(data), 'idle'),
			compare: (a: number, b: number) => a - b
		},
		unknownActivity: {
			getValue: (data: ITimeLogGroupedDailyReport) => getTaskDurationByType(getEmployeeLog(data), 'unknown'),
			compare: (a: number, b: number) => a - b
		},
		activityLevel: {
			getValue: (data: ITimeLogGroupedDailyReport) => getEmployeeLog(data)?.activity || 0,
			compare: (a: number, b: number) => a - b
		}
	};

	const { items, sortConfig, requestSort } = useSortableData(rapportDailyActivity || [], sortableColumns);
	const { total, onPageChange, itemsPerPage, itemOffset, endOffset, setItemsPerPage, currentItems, pageCount } =
		usePagination({ items, defaultItemsPerPage: 10 });

	if (isLoading) {
		return <LoadingTable />;
	}

	if (!rapportDailyActivity?.length) {
		return (
			<div className="grow w-full min-h-[600px] flex items-center justify-center flex-col">
				<LazyAnimatedEmptyState
					title={t('common.NO_ACTIVITY_DATA')}
					message={t('common.SELECT_DIFFERENT_DATE')}
					showBorder={true}
				/>
			</div>
		);
	}

	return (
		<>
			{employeeLog && (
				<Suspense fallback={<ModalSkeleton size="lg" />}>
					<LazyActivityModal employeeLog={employeeLog} isOpen={isOpen} closeModal={closeModal} />
				</Suspense>
			)}
			<div className="w-full dark:bg-dark--theme-light">
				<div className="relative rounded-md border">
					<div className="overflow-x-auto">
						<div className="inline-block min-w-full align-middle">
							<div className="overflow-hidden">
								<Table className="w-full">
									<TableHeader>
										<TableRow className="font-normal text-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-gray-200">
											<TableHead className="w-[320px] py-3">
												<SortPopover
													label={t('common.teamStats.MEMBER')}
													sortKey="member"
													currentConfig={sortConfig}
													onSort={requestSort}
												/>
											</TableHead>
											<TableHead className="w-[100px]">
												<SortPopover
													label={t('common.teamStats.TOTAL_TIME')}
													sortKey="totalTime"
													currentConfig={sortConfig}
													onSort={requestSort}
												/>
											</TableHead>
											<TableHead className="w-[80px]">
												<SortPopover
													label={t('common.teamStats.TRACKED')}
													sortKey="tracked"
													currentConfig={sortConfig}
													onSort={requestSort}
												/>
											</TableHead>
											<TableHead className="w-[120px]">
												<SortPopover
													label={t('common.teamStats.MANUALLY_ADDED')}
													sortKey="manual"
													currentConfig={sortConfig}
													onSort={requestSort}
												/>
											</TableHead>
											<TableHead className="w-[100px]">
												<SortPopover
													label={t('common.teamStats.ACTIVE_TIME')}
													sortKey="activeTime"
													currentConfig={sortConfig}
													onSort={requestSort}
												/>
											</TableHead>
											<TableHead className="w-[80px]">
												<SortPopover
													label={t('common.teamStats.IDLE_TIME')}
													sortKey="idleTime"
													currentConfig={sortConfig}
													onSort={requestSort}
												/>
											</TableHead>
											<TableHead className="w-[120px]">
												<SortPopover
													label={t('common.teamStats.UNKNOWN_ACTIVITY')}
													sortKey="unknownActivity"
													currentConfig={sortConfig}
													onSort={requestSort}
												/>
											</TableHead>
											<TableHead className="w-[200px]">
												<SortPopover
													label={t('common.teamStats.ACTIVITY_LEVEL')}
													sortKey="activityLevel"
													currentConfig={sortConfig}
													onSort={requestSort}
												/>
											</TableHead>
											<TableHead className="w-[10px]"></TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{currentItems?.map((dayData) => (
											<Fragment key={`date-group-${dayData.date}`}>
												<TableRow className="bg-gray-50/50 dark:bg-gray-800/50">
													<TableCell colSpan={9} className="py-3 font-medium">
														{format(new Date(dayData.date), 'EEEE dd MMM yyyy')}
													</TableCell>
												</TableRow>
												{dayData.logs?.map(
													(projectLog) =>
														projectLog.employeeLogs?.map((employeeLog) => (
															<TableRow key={`employee-${employeeLog.employee?.id}`}>
																<TableCell className="w-[320px] font-normal">
																	<div className="flex gap-2 items-center">
																		<Avatar className="w-8 h-8 shrink-0">
																			<AvatarImage
																				src={
																					employeeLog.employee?.user
																						?.imageUrl || ''
																				}
																				alt={
																					employeeLog.employee?.user?.name ||
																					'User'
																				}
																			/>
																			<AvatarFallback>
																				{employeeLog.employee?.user
																					?.name?.[0] || 'U'}
																			</AvatarFallback>
																		</Avatar>
																		<span className="truncate">
																			{employeeLog.employee?.user?.name ||
																				'Unknown User'}
																		</span>
																	</div>
																</TableCell>
																<TableCell className="w-[100px]">
																	{formatDuration(employeeLog.sum || 0)}
																</TableCell>
																<TableCell className="w-[80px]">
																	{formatPercentage(employeeLog.activity)}
																</TableCell>
																<TableCell className="w-[120px]">
																	{formatPercentage(0)}
																</TableCell>
																<TableCell className="w-[100px] text-green-500">
																	{formatPercentage(100)}
																</TableCell>
																<TableCell className="w-[80px] text-green-500">
																	{formatPercentage(0)}
																</TableCell>
																<TableCell className="w-[120px] text-green-500">
																	{formatPercentage(0)}
																</TableCell>
																<TableCell className="w-[200px]">
																	<div className="flex gap-2 items-center">
																		<div className="w-full h-2 bg-gray-100 rounded-full dark:bg-gray-600">
																			<div
																				className={`h-full rounded-full ${getProgressColor(employeeLog.activity || 0)}`}
																				style={{
																					width: `${employeeLog.activity || 0}%`
																				}}
																			/>
																		</div>
																		<span className="w-12 text-sm">
																			{(employeeLog.activity || 0).toFixed(1)}%
																		</span>
																	</div>
																</TableCell>
																<TableCell className="w-[10px] text-green-500">
																	<>
																		<Button
																			variant="ghost"
																			size="icon"
																			onClick={() => {
																				setEmployeeLog(employeeLog);
																				openModal();
																			}}
																			aria-label={`View activity chart for ${employeeLog.employee?.user?.name || 'employee'}`}
																			title="View activity chart"
																		>
																			<ChartIcon />
																		</Button>
																	</>
																</TableCell>
															</TableRow>
														)) || []
												) || []}
											</Fragment>
										))}
									</TableBody>
								</Table>
							</div>
						</div>
					</div>
				</div>

				<div className="flex gap-4 justify-between items-center p-2 w-full sm:flex-row">
					<Paginate
						total={total}
						itemsPerPage={itemsPerPage}
						onPageChange={onPageChange}
						pageCount={pageCount}
						itemOffset={itemOffset}
						endOffset={endOffset}
						setItemsPerPage={setItemsPerPage}
						className="px-1 w-full"
					/>
				</div>
			</div>
		</>
	);
}

const LoadingTable = () => {
	const t = useTranslations();
	return (
		<Card className="bg-white rounded-md border border-gray-100 dark:border-gray-700 dark:bg-dark--theme-light min-h-[600px]">
			<Table>
				<TableHeader>
					<TableRow className="font-normal text-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-gray-200">
						<TableHead className="w-[320px] py-3">{t('common.teamStats.MEMBER')}</TableHead>
						<TableHead className="w-[100px]">{t('common.teamStats.TOTAL_TIME')}</TableHead>
						<TableHead className="w-[80px]">{t('common.teamStats.TRACKED')}</TableHead>
						<TableHead className="w-[120px]">{t('common.teamStats.MANUALLY_ADDED')}</TableHead>
						<TableHead className="w-[100px]">{t('common.teamStats.ACTIVE_TIME')}</TableHead>
						<TableHead className="w-[80px]">{t('common.teamStats.IDLE_TIME')}</TableHead>
						<TableHead className="w-[120px]">{t('common.teamStats.UNKNOWN_ACTIVITY')}</TableHead>
						<TableHead className="w-[200px]">{t('common.teamStats.ACTIVITY_LEVEL')}</TableHead>
						<TableHead className="w-[10px]"></TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{[...Array(7)].map((_, i) => (
						<TableRow key={i}>
							<TableCell className="w-[320px]">
								<div className="flex gap-2 items-center">
									<Skeleton className="w-8 h-8 rounded-full" />
									<Skeleton className="w-32 h-4" />
								</div>
							</TableCell>
							<TableCell className="w-[100px]">
								<Skeleton className="w-16 h-4" />
							</TableCell>
							<TableCell className="w-[80px]">
								<Skeleton className="w-12 h-4" />
							</TableCell>
							<TableCell className="w-[120px]">
								<Skeleton className="w-20 h-4" />
							</TableCell>
							<TableCell className="w-[100px]">
								<Skeleton className="w-16 h-4" />
							</TableCell>
							<TableCell className="w-[80px]">
								<Skeleton className="w-12 h-4" />
							</TableCell>
							<TableCell className="w-[120px]">
								<Skeleton className="w-20 h-4" />
							</TableCell>
							<TableCell className="w-[200px]">
								<Skeleton className="w-32 h-4" />
							</TableCell>
							<TableCell className="w-[10px]"></TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</Card>
	);
};
