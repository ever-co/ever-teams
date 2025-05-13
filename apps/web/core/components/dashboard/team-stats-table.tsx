'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/core/components/common/avatar';
import { Button } from '@/core/components/common/button2';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/common/table';
import { PaginationDropdown } from '@/core/components/settings/page-dropdown';
import { format } from 'date-fns';
import { ITimerEmployeeLog, ITimerLogGrouped } from '@/core/types/interfaces';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Fragment, useState } from 'react';
import { SortPopover } from '@/core/components/common/sort-popover';
import { ChartIcon } from './team-icon';
import { ActivityModal } from './activity-modal';
import { useModal } from '@/core/hooks';
import { useTranslations } from 'next-intl';
import { useSortableData } from '@/core/hooks/common/use-sortable-data';
import { Skeleton } from '@/core/components/common/skeleton';
import { Card } from '@/core/components/common/card';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';

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
	rapportDailyActivity?: ITimerLogGrouped[];
	isLoading?: boolean;
}) {
	const t = useTranslations();
	const [employeeLog, setEmployeeLog] = useState<ITimerEmployeeLog | undefined>(undefined);
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const totalPages = rapportDailyActivity ? Math.ceil(rapportDailyActivity.length / pageSize) : 0;
	const startIndex = (currentPage - 1) * pageSize;
	const endIndex = startIndex + pageSize;
	const { openModal, closeModal, isOpen } = useModal();

	const getEmployeeLog = (data: ITimerLogGrouped): ITimerEmployeeLog | undefined => {
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

	const getTotalTime = (data: ITimerLogGrouped): number => {
		if (!data?.logs) return 0;
		return data.logs.reduce(
			(sum, log) => sum + log.employeeLogs.reduce((empSum, empLog) => empSum + empLog.sum, 0),
			0
		);
	};

	const sortableColumns = {
		member: {
			getValue: (data: ITimerLogGrouped) => getEmployeeLog(data)?.employee?.fullName?.toLowerCase() || '',
			compare: (a: string, b: string) => a.localeCompare(b)
		},
		totalTime: {
			getValue: getTotalTime,
			compare: (a: number, b: number) => a - b
		},
		tracked: {
			getValue: (data: ITimerLogGrouped) =>
				getEmployeeLog(data)?.tasks.reduce((sum, task) => sum + task.duration, 0) || 0,
			compare: (a: number, b: number) => a - b
		},
		manual: {
			getValue: (data: ITimerLogGrouped) => getTaskDurationByType(getEmployeeLog(data), 'manual'),
			compare: (a: number, b: number) => a - b
		},
		activeTime: {
			getValue: (data: ITimerLogGrouped) => getTaskDurationByType(getEmployeeLog(data), 'active'),
			compare: (a: number, b: number) => a - b
		},
		idleTime: {
			getValue: (data: ITimerLogGrouped) => getTaskDurationByType(getEmployeeLog(data), 'idle'),
			compare: (a: number, b: number) => a - b
		},
		unknownActivity: {
			getValue: (data: ITimerLogGrouped) => getTaskDurationByType(getEmployeeLog(data), 'unknown'),
			compare: (a: number, b: number) => a - b
		},
		activityLevel: {
			getValue: (data: ITimerLogGrouped) => getEmployeeLog(data)?.activity || 0,
			compare: (a: number, b: number) => a - b
		}
	};

	const { items: sortedData, sortConfig, requestSort } = useSortableData(rapportDailyActivity || [], sortableColumns);

	const paginatedData = sortedData.slice(startIndex, endIndex);

	const goToPage = (page: number) => {
		setCurrentPage(page);
	};

	const goToFirstPage = () => goToPage(1);
	const goToLastPage = () => goToPage(totalPages);
	const goToPreviousPage = () => goToPage(Math.max(1, currentPage - 1));
	const goToNextPage = () => goToPage(Math.min(totalPages, currentPage + 1));

	if (isLoading) {
		return <LoadingTable />;
	}

	if (!rapportDailyActivity?.length) {
		return (
			<div className="grow w-full min-h-[600px] flex items-center justify-center flex-col">
				<AnimatedEmptyState
					title={t('common.NO_ACTIVITY_DATA')}
					message={t('common.SELECT_DIFFERENT_DATE')}
					showBorder={true}
				/>
			</div>
		);
	}

	return (
		<>
			{employeeLog && <ActivityModal employeeLog={employeeLog} isOpen={isOpen} closeModal={closeModal} />}
			<div className="w-full dark:bg-dark--theme-light">
				<div className="relative border rounded-md">
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
										{paginatedData?.map((dayData) => (
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
																	<div className="flex items-center gap-2">
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
																	<div className="flex items-center gap-2">
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
				<div className="flex items-center justify-between gap-4 p-2 sm:flex-row">
					<div className="flex items-center space-x-2">
						<Button variant="outline" size="icon" onClick={goToFirstPage} disabled={currentPage === 1}>
							<ChevronsLeft className="w-4 h-4" />
						</Button>
						<Button variant="outline" size="icon" onClick={goToPreviousPage} disabled={currentPage === 1}>
							<ChevronLeft className="w-4 h-4" />
						</Button>
						<div className="flex gap-1 items-center overflow-x-auto max-w-[300px] p-1">
							{Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
								<Button
									key={page}
									variant="outline"
									size="sm"
									onClick={() => goToPage(page)}
									className={currentPage === page ? 'bg-primary text-primary-foreground' : ''}
								>
									{page}
								</Button>
							))}
						</div>
						<Button
							variant="outline"
							size="icon"
							onClick={goToNextPage}
							disabled={currentPage === totalPages}
						>
							<ChevronRight className="w-4 h-4" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							onClick={goToLastPage}
							disabled={currentPage === totalPages}
						>
							<ChevronsRight className="w-4 h-4" />
						</Button>
					</div>
					<div className="flex items-center gap-4">
						<PaginationDropdown
							setValue={(value) => {
								setPageSize(value);
								setCurrentPage(1);
							}}
							total={rapportDailyActivity?.length}
						/>
						<div className="text-sm text-center text-[#111827] dark:text-gray-400 sm:text-left">
							Showing {startIndex + 1} to {Math.min(endIndex, rapportDailyActivity?.length || 0)} of{' '}
							{rapportDailyActivity?.length || 0} entries
						</div>
					</div>
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
								<div className="flex items-center gap-2">
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
