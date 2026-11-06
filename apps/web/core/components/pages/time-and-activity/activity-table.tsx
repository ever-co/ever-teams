import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/common/table';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityLevelCell } from './activity-level-cell';
import ActivityTableSkeleton from '../../activities/activity-table-skeleton';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import { ProjectCell } from '../../projects/project-cell';
import { TrackedHoursCell } from './tracked-hours-cell';
import { EarningsCell } from './earnings-cell';
import { Avatar } from '../../duplicated-components/avatar';
import {
	ITimeLogGroupedDailyReport,
	ITimerEmployeeLog,
	ITimerProjectLog,
	ITimerTaskLog
} from '@/core/types/interfaces/activity/activity-report';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useTranslations } from 'next-intl';
import { ChevronDown, Clock } from '@/core/components/icons';
import { Button } from '@/core/components/duplicated-components/_button';

interface TimeSlot {
	duration: number;
}

interface ITimerEmployeeLogExtended extends ITimerEmployeeLog {
	timeSlots?: TimeSlot[];
	timeLogs?: ITimerTaskLog[];
}

interface TaskLog {
	task: TTask;
	duration: number;
	description: string;
	earnings?: number;
}

interface EmployeeLog {
	employee: {
		id: string;
		fullName: string;
		billRateValue?: number;
		billRateCurrency?: string;
		user: {
			imageUrl: string;
		};
	};
	sum: number;
	tasks: TaskLog[];
	activity: number;
	earnings: number;
}

interface ProjectLog {
	project: {
		id: string;
		name: string;
		imageUrl: string;
	};
	employeeLogs: EmployeeLog[];
}

interface DailyLog {
	date: string;
	logs: ProjectLog[];
	sum?: number;
	activity?: number;
	earnings: number;
}

interface ViewOption {
	id: string;
	label: string;
	checked: boolean;
}

interface ActivityTableProps {
	rapportDailyActivity: ITimeLogGroupedDailyReport[] | DailyLog[];
	viewOptions: ViewOption[];
	isLoading?: boolean;
}

const ActivityTable: React.FC<ActivityTableProps> = ({ rapportDailyActivity, viewOptions, isLoading = false }) => {
	const t = useTranslations();
	const [currentPage, setCurrentPage] = useState(1);
	const [entriesPerPage, setEntriesPerPage] = useState(10);
	const [showEntriesDropdown, setShowEntriesDropdown] = useState(false);

	// Memoize the function to format durations
	const formatDuration = useCallback((duration: number) => {
		const hours = Math.floor(duration / 3600);
		const minutes = Math.floor((duration % 3600) / 60);
		return `${hours}:${minutes.toString().padStart(2, '0')}h`;
	}, []);

	// Function to get the primary currency from a day's logs
	const getPrimaryCurrency = useCallback((logs: ProjectLog[]): string => {
		for (const log of logs) {
			for (const empLog of log.employeeLogs) {
				if (empLog.employee.billRateCurrency && empLog.employee.billRateCurrency !== 'USD') {
					return empLog.employee.billRateCurrency;
				}
			}
		}
		return 'USD'; // Default to USD
	}, []);

	// Transform data from ITimerLogGrouped to DailyLog format
	const transformedData = useMemo(() => {
		if (!rapportDailyActivity || rapportDailyActivity.length === 0) {
			return [] as DailyLog[];
		}

		if ('logs' in rapportDailyActivity[0]) {
			return rapportDailyActivity as DailyLog[];
		}

		return (rapportDailyActivity as ITimeLogGroupedDailyReport[]).map((dayData): DailyLog => {
			const logs = dayData.logs.map(
				(log: ITimerProjectLog): ProjectLog => ({
					project: {
						id: log.project.id,
						name: log.project.name,
						imageUrl: log.project.imageUrl || ''
					},
					employeeLogs: (log.employeeLogs || []).map((empLog: ITimerEmployeeLogExtended): EmployeeLog => {
						const duration =
							empLog.timeSlots?.reduce((acc: number, slot: TimeSlot) => acc + (slot.duration || 0), 0) ||
							0;

						// Calculate earnings: duration (seconds) * hourly rate
						const billRate = empLog.employee.billRateValue || 0;
						const durationHours = duration / 3600; // Convert seconds to hours
						const earnings = durationHours * billRate;

						return {
							employee: {
								id: empLog.employee.id,
								fullName: empLog.employee.fullName || '',
								billRateValue: empLog.employee.billRateValue,
								billRateCurrency: empLog.employee.billRateCurrency,
								user: {
									imageUrl: empLog.employee.user.imageUrl || ''
								}
							},
							sum: duration,
							tasks: (empLog.timeLogs || []).map(
								(timeLog: ITimerTaskLog): TaskLog => ({
									task: timeLog.task,
									duration: timeLog.duration || 0,
									description: timeLog.description || ''
								})
							),
							activity: empLog.activity || 0,
							earnings
						};
					})
				})
			);

			const totalDuration = logs.reduce((acc: number, log) => {
				return (
					acc +
					log.employeeLogs.reduce((logAcc: number, empLog) => {
						return logAcc + empLog.sum;
					}, 0)
				);
			}, 0);

			const totalActivity = logs.reduce((acc: number, log) => {
				return (
					acc +
					log.employeeLogs.reduce((logAcc: number, empLog) => {
						return logAcc + empLog.activity;
					}, 0)
				);
			}, 0);

			const employeeCount = logs.reduce((acc: number, log) => {
				return acc + log.employeeLogs.length;
			}, 0);

			const totalEarnings = logs.reduce((acc: number, log) => {
				return (
					acc +
					log.employeeLogs.reduce((logAcc: number, empLog) => {
						return logAcc + empLog.earnings;
					}, 0)
				);
			}, 0);

			return {
				date: dayData.date,
				logs,
				sum: totalDuration,
				activity: Math.round(totalActivity / employeeCount),
				earnings: totalEarnings
			};
		});
	}, [rapportDailyActivity]);

	// Memoize entries options
	const entryOptions = useMemo(() => [10, 25, 50], []);

	// Memoize column visibility settings
	const columnVisibility = useMemo(() => {
		const visibilityMap = new Map(viewOptions.map((opt) => [opt.id, opt.checked]));
		return {
			member: visibilityMap.get('member') ?? true,
			project: visibilityMap.get('project') ?? true,
			task: visibilityMap.get('task') ?? true,
			trackedHours: visibilityMap.get('trackedHours') ?? true,
			earnings: visibilityMap.get('earnings') ?? true,
			activityLevel: visibilityMap.get('activityLevel') ?? true,
			startedAt: visibilityMap.get('startedAt') ?? true,
			stoppedAt: visibilityMap.get('stoppedAt') ?? true,
			duration: visibilityMap.get('duration') ?? true
		};
	}, [viewOptions]);

	// Memoize pagination calculations
	const { totalPages, startIndex, endIndex, currentEntries } = useMemo(() => {
		const total = Math.ceil(transformedData.length / entriesPerPage);
		const start = (currentPage - 1) * entriesPerPage;
		const end = Math.min(start + entriesPerPage, transformedData.length);
		return {
			totalPages: total,
			startIndex: start,
			endIndex: end,
			currentEntries: transformedData.slice(start, end)
		};
	}, [transformedData, currentPage, entriesPerPage]);

	// Event handler callbacks
	const handleEntriesPerPageChange = useCallback((value: number) => {
		setEntriesPerPage(value);
		setShowEntriesDropdown(false);
		setCurrentPage(1);
	}, []);

	const handlePageChange = useCallback((page: number) => {
		setCurrentPage(page);
	}, []);

	if (isLoading) {
		return (
			<ActivityTableSkeleton
				columnVisibility={{
					member: true,
					project: true,
					task: true,
					trackedHours: true,
					earnings: true,
					activityLevel: true,
					startedAt: true,
					stoppedAt: true,
					duration: true
				}}
			/>
		);
	}

	if (!transformedData.length) {
		return (
			<AnimatedEmptyState
				title={t('timeActivity.NO_ACTIVITY_DATA')}
				message={t('timeActivity.NO_ACTIVITY_DATA_MESSAGE')}
			/>
		);
	}

	return (
		<div className="flex flex-col">
			{currentEntries.map(
				(dayLog: DailyLog) =>
					dayLog && (
						<div
							key={dayLog?.date || 'no-date'}
							className="overflow-hidden hairline-b border-border last:border-b-0"
						>
							<div className="px-4 py-3 bg-foreground/2.5 hairline-b border-border">
								<div className="flex flex-wrap gap-x-6 gap-y-2 items-center text-sm text-muted-foreground">
									<div className="font-medium text-foreground">
										{format(new Date(dayLog.date), 'EEEE dd MMM yyyy')}
									</div>
									<div className="flex items-center gap-1.5">
										<span>{t('timeActivity.HOURS_LABEL')}</span>
										<span className="font-medium tabular-nums text-foreground">
											{formatDuration(dayLog.sum || 0)}
										</span>
									</div>
									<div className="flex items-center gap-1.5 hairline-l border-border pl-6">
										<span>{t('timeActivity.EARNINGS_LABEL')}</span>
										<span className="font-medium tabular-nums text-foreground">
											{dayLog?.earnings ? dayLog.earnings?.toFixed(2) : '0.00'}{' '}
											{getPrimaryCurrency(dayLog.logs)}
										</span>
									</div>
									<div className="flex items-center gap-1.5 hairline-l border-border pl-6">
										<span>{t('timeActivity.AVERAGE_ACTIVITY_LABEL')}</span>
										<span className="font-medium tabular-nums text-foreground">
											{dayLog.activity || 0}%
										</span>
									</div>
								</div>
							</div>
							<Table>
								<TableHeader>
									<TableRow>
										{columnVisibility.member && (
											<TableHead className="px-4 whitespace-nowrap">
												{t('timeActivity.MEMBER_HEADER')}
											</TableHead>
										)}
										{columnVisibility.project && (
											<TableHead className="px-4 whitespace-nowrap">
												{t('timeActivity.PROJECT_HEADER')}
											</TableHead>
										)}
										{columnVisibility.trackedHours && (
											<TableHead className="px-4 text-right whitespace-nowrap">
												{t('timeActivity.TRACKED_HOURS_HEADER')}
											</TableHead>
										)}
										{columnVisibility.earnings && (
											<TableHead className="px-4 text-right whitespace-nowrap">
												{t('timeActivity.EARNINGS_HEADER')}
											</TableHead>
										)}
										{columnVisibility.activityLevel && (
											<TableHead className="px-4 whitespace-nowrap">
												{t('timeActivity.ACTIVITY_LEVEL_HEADER')}
											</TableHead>
										)}
									</TableRow>
								</TableHeader>
								<TableBody>
									{dayLog.logs.flatMap((projectLog) =>
										projectLog.employeeLogs.map((employeeLog) => (
											<TableRow
												key={`${projectLog.project?.id || 'no-project'}-${employeeLog.employee?.id || 'no-employee'}`}
											>
												{columnVisibility.member && employeeLog.employee && (
													<TableCell className="px-4 py-2.5">
														<div className="flex gap-3 items-center">
															<Avatar size={32} className="w-8 h-8 rounded-full">
																{employeeLog.employee.user?.imageUrl ? (
																	<img
																		src={employeeLog.employee.user.imageUrl}
																		alt={
																			employeeLog.employee.fullName || 'Employee'
																		}
																		className="object-cover w-full h-full rounded-full"
																		loading="lazy"
																	/>
																) : (
																	<img
																		src="/assets/images/avatar.png"
																		alt={
																			employeeLog.employee.fullName || 'Employee'
																		}
																		className="object-cover w-full h-full rounded-full"
																		loading="lazy"
																	/>
																)}
															</Avatar>
															<span className="font-medium text-foreground">
																{employeeLog.employee.fullName ||
																	t('timeActivity.UNNAMED_EMPLOYEE')}
															</span>
														</div>
													</TableCell>
												)}
												{columnVisibility.project && (
													<TableCell className="px-4 py-2.5">
														<ProjectCell
															imageUrl={projectLog.project?.imageUrl || ''}
															name={projectLog.project?.name || t('common.NO_PROJECT')}
														/>
													</TableCell>
												)}
												{columnVisibility.trackedHours && (
													<TableCell className="px-4 py-2.5 text-right">
														<TrackedHoursCell
															duration={employeeLog.sum}
															formatDuration={formatDuration}
														/>
													</TableCell>
												)}
												{columnVisibility.earnings && (
													<TableCell className="px-4 py-2.5 text-right">
														<EarningsCell
															earnings={employeeLog.earnings}
															currency={employeeLog.employee.billRateCurrency || 'USD'}
														/>
													</TableCell>
												)}
												{columnVisibility.activityLevel && (
													<TableCell className="px-4 py-2.5">
														<ActivityLevelCell
															activity={employeeLog.activity}
															duration={employeeLog.sum}
														/>
													</TableCell>
												)}
											</TableRow>
										))
									)}
									{dayLog.logs.some((log) => log.employeeLogs.some((empLog) => empLog.sum === 0)) && (
										<TableRow>
											<TableCell colSpan={5} className="px-4 py-3">
												<div className="flex gap-2 items-center text-sm text-muted-foreground">
													<Clock className="size-4" />
													<span>{t('timeActivity.NO_TIME_ACTIVITY')}</span>
												</div>
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</div>
					)
			)}

			{/* Pagination controls */}
			<div className="flex flex-wrap justify-between items-center gap-3 hairline-t border-border px-4 py-3">
				<div className="flex gap-4 items-center">
					<div className="relative">
						<Button
							variant="outline"
							size="default"
							onClick={() => setShowEntriesDropdown(!showEntriesDropdown)}
						>
							{t('timeActivity.SHOW_ENTRIES', { count: entriesPerPage })}
							<ChevronDown className="text-muted-foreground" />
						</Button>
						{showEntriesDropdown && (
							<div className="absolute bottom-full left-0 z-10 mb-1 w-full rounded-xl bg-popover p-1 text-popover-foreground hairline-ring ring-border shadow-md shadow-black/6.5">
								{entryOptions.map((option) => (
									<button
										key={option}
										onClick={() => handleEntriesPerPageChange(option)}
										className="w-full rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-foreground/5 focus-visible:bg-foreground/5"
									>
										{t('timeActivity.SHOW_ENTRIES', { count: option })}
									</button>
								))}
							</div>
						)}
					</div>
					<span className="text-xs tabular-nums text-muted-foreground">
						{t('timeActivity.SHOWING_ENTRIES', {
							start: startIndex + 1,
							end: endIndex,
							total: transformedData.length
						})}
					</span>
				</div>

				<div className="flex gap-2 items-center">
					<Button
						variant="outline"
						size="default"
						onClick={() => handlePageChange(1)}
						disabled={currentPage === 1}
					>
						{t('timeActivity.FIRST')}
					</Button>
					<Button
						variant="outline"
						size="default"
						onClick={() => handlePageChange(currentPage - 1)}
						disabled={currentPage === 1}
					>
						{t('timeActivity.PREVIOUS')}
					</Button>
					<Button
						variant="outline"
						size="default"
						onClick={() => handlePageChange(currentPage + 1)}
						disabled={currentPage === totalPages}
					>
						{t('timeActivity.NEXT')}
					</Button>
					<Button
						variant="outline"
						size="default"
						onClick={() => handlePageChange(totalPages)}
						disabled={currentPage === totalPages}
					>
						{t('timeActivity.LAST')}
					</Button>
				</div>
			</div>
		</div>
	);
};

export default React.memo(ActivityTable);
