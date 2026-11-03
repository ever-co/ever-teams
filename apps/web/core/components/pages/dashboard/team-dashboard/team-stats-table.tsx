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
import { ITimerEmployeeLog, ITimeLogGroupedDailyReport } from '@/core/types/interfaces/activity/activity-report';
import { Paginate } from '@/core/components/duplicated-components/_pagination';

const getProgressColor = (activityLevel: number) => {
	if (isNaN(activityLevel) || activityLevel < 0) return 'bg-foreground/20';
	if (activityLevel > 100) return 'bg-success';
	if (activityLevel <= 20) return 'bg-destructive';
	if (activityLevel <= 50) return 'bg-warning';
	return 'bg-success';
};

const formatDuration = (duration: number) => {
	const hours = Math.floor(duration / 3600);
	const minutes = Math.floor((duration % 3600) / 60);
	const seconds = duration % 60;

	const pad = (num: number) => num.toString().padStart(2, '0');

	return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

// The daily report returns no manual, active, idle or unknown split: those cells say so instead of a made-up 0% or 100%.
const EMPTY_VALUE = '–';

function tasksDuration(employeeLog: ITimerEmployeeLog | undefined): number {
	const tasks = employeeLog?.tasks ?? [];
	return tasks.reduce((sum, task) => sum + task.duration, 0);
}

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
			getValue: (data: ITimeLogGroupedDailyReport) => tasksDuration(getEmployeeLog(data)),
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
					showBorder={false}
					noBg
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
			<div className="w-full">
				<div className="overflow-x-auto">
					<Table className="w-full">
						<TableHeader>
							<TableRow className="bg-foreground/2.5 hover:bg-foreground/2.5">
								<TableHead className="w-[320px] py-3">
									<SortPopover
										label={t('common.teamStats.MEMBER')}
										sortKey="member"
										currentConfig={sortConfig}
										onSort={requestSort}
									/>
								</TableHead>
								<TableHead className="w-[100px] [&>div]:justify-end">
									<SortPopover
										label={t('common.teamStats.TOTAL_TIME')}
										sortKey="totalTime"
										currentConfig={sortConfig}
										onSort={requestSort}
									/>
								</TableHead>
								<TableHead className="w-[80px] [&>div]:justify-end">
									<SortPopover
										label={t('common.teamStats.TRACKED')}
										sortKey="tracked"
										currentConfig={sortConfig}
										onSort={requestSort}
									/>
								</TableHead>
								<TableHead className="w-[120px] [&>div]:justify-end">
									<SortPopover
										label={t('common.teamStats.MANUALLY_ADDED')}
										sortKey="manual"
										currentConfig={sortConfig}
										onSort={requestSort}
									/>
								</TableHead>
								<TableHead className="w-[100px] [&>div]:justify-end">
									<SortPopover
										label={t('common.teamStats.ACTIVE_TIME')}
										sortKey="activeTime"
										currentConfig={sortConfig}
										onSort={requestSort}
									/>
								</TableHead>
								<TableHead className="w-[80px] [&>div]:justify-end">
									<SortPopover
										label={t('common.teamStats.IDLE_TIME')}
										sortKey="idleTime"
										currentConfig={sortConfig}
										onSort={requestSort}
									/>
								</TableHead>
								<TableHead className="w-[120px] [&>div]:justify-end">
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
									<TableRow className="bg-foreground/2.5 hover:bg-foreground/2.5">
										<TableCell colSpan={9} className="py-2.5 text-sm font-medium">
											{format(new Date(dayData.date), 'EEEE dd MMM yyyy')}
										</TableCell>
									</TableRow>
									{dayData.logs?.map(
										(projectLog) =>
											projectLog.employeeLogs?.map((employeeLog) => (
												<TableRow key={`employee-${employeeLog.employee?.id}`}>
													<TableCell className="w-[320px] font-normal">
														<div className="flex gap-2 items-center">
															<Avatar className="size-8 shrink-0">
																<AvatarImage
																	src={employeeLog.employee?.user?.imageUrl || ''}
																	alt={employeeLog.employee?.user?.name || 'User'}
																/>
																<AvatarFallback>
																	{employeeLog.employee?.user?.name?.[0] || 'U'}
																</AvatarFallback>
															</Avatar>
															<span className="truncate">
																{employeeLog.employee?.user?.name || 'Unknown User'}
															</span>
														</div>
													</TableCell>
													<TableCell className="w-[100px] text-right font-medium tabular-nums">
														{formatDuration(employeeLog.sum || 0)}
													</TableCell>
													<TableCell className="w-[80px] text-right tabular-nums">
														{formatDuration(tasksDuration(employeeLog))}
													</TableCell>
													<TableCell className="w-[120px] text-right tabular-nums text-muted-foreground">
														{EMPTY_VALUE}
													</TableCell>
													<TableCell className="w-[100px] text-right tabular-nums text-muted-foreground">
														{EMPTY_VALUE}
													</TableCell>
													<TableCell className="w-[80px] text-right tabular-nums text-muted-foreground">
														{EMPTY_VALUE}
													</TableCell>
													<TableCell className="w-[120px] text-right tabular-nums text-muted-foreground">
														{EMPTY_VALUE}
													</TableCell>
													<TableCell className="w-[200px]">
														<div className="flex gap-2 items-center">
															<div className="w-full h-1.5 overflow-hidden rounded-full bg-foreground/10">
																<div
																	className={`h-full rounded-full ${getProgressColor(employeeLog.activity || 0)}`}
																	style={{
																		width: `${employeeLog.activity || 0}%`
																	}}
																/>
															</div>
															<span className="w-12 text-right text-sm tabular-nums">
																{(employeeLog.activity || 0).toFixed(1)}%
															</span>
														</div>
													</TableCell>
													<TableCell className="w-[10px]">
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

				<div className="flex gap-4 justify-between items-center hairline-t border-border px-4 py-3 w-full sm:flex-row">
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
		<div className="min-h-[600px]">
			<Table>
				<TableHeader>
					<TableRow className="bg-foreground/2.5 hover:bg-foreground/2.5">
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
		</div>
	);
};
