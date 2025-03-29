/* eslint-disable @next/next/no-img-element */
import { format } from 'date-fns';
import { Avatar } from '@/lib/components';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCallback, useMemo, useState } from 'react';
import { ITimerEmployeeLog, ITimerLogGrouped, ITimerProjectLog, ITimerTaskLog, ITimerTask } from '@app/interfaces';
import { ProjectCell } from './ProjectCell';
import { TrackedHoursCell } from './TrackedHoursCell';
import { EarningsCell } from './EarningsCell';
import { ActivityLevelCell } from './ActivityLevelCell';
import { ActivityTableSkeleton } from './ActivityTableSkeleton';
import React from 'react';

interface TimeSlot {
	duration: number;
}

interface ITimerEmployeeLogExtended extends ITimerEmployeeLog {
	timeSlots?: TimeSlot[];
	timeLogs?: ITimerTaskLog[];
}

interface TaskLog {
	task: ITimerTask;
	duration: number;
	description: string;
	earnings?: number;
}

interface EmployeeLog {
	employee: {
		id: string;
		fullName: string;
		user: {
			imageUrl: string;
		};
	};
	sum: number;
	tasks: TaskLog[];
	activity: number;
	earnings?: number;
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
	earnings?: number;
}

interface ViewOption {
	id: string;
	label: string;
	checked: boolean;
}

interface ActivityTableProps {
	rapportDailyActivity: ITimerLogGrouped[] | DailyLog[];
	viewOptions: ViewOption[];
	isLoading?: boolean;
}

const ActivityTable: React.FC<ActivityTableProps> = ({ rapportDailyActivity, viewOptions, isLoading = false }) => {
	const [currentPage, setCurrentPage] = useState(1);
	const [entriesPerPage, setEntriesPerPage] = useState(10);
	const [showEntriesDropdown, setShowEntriesDropdown] = useState(false);

	// Memoize the function to format durations
	const formatDuration = useCallback((duration: number) => {
		const hours = Math.floor(duration / 3600);
		const minutes = Math.floor((duration % 3600) / 60);
		return `${hours}:${minutes.toString().padStart(2, '0')}h`;
	}, []);

	// Transform data from ITimerLogGrouped to DailyLog format
	const transformedData = useMemo(() => {
		if (!rapportDailyActivity || rapportDailyActivity.length === 0) {
			return [] as DailyLog[];
		}

		if ('logs' in rapportDailyActivity[0]) {
			return rapportDailyActivity as DailyLog[];
		}

		return (rapportDailyActivity as ITimerLogGrouped[]).map((dayData): DailyLog => {
			const logs = dayData.logs.map(
				(log: ITimerProjectLog): ProjectLog => ({
					project: {
						id: log.project.id,
						name: log.project.name,
						imageUrl: log.project.imageUrl || ''
					},
					employeeLogs: (log.employeeLogs || []).map(
						(empLog: ITimerEmployeeLogExtended): EmployeeLog => ({
							employee: {
								id: empLog.employee.id,
								fullName: empLog.employee.fullName,
								user: {
									imageUrl: empLog.employee.user.imageUrl
								}
							},
							sum:
								empLog.timeSlots?.reduce(
									(acc: number, slot: TimeSlot) => acc + (slot.duration || 0),
									0
								) || 0,
							tasks: (empLog.timeLogs || []).map(
								(timeLog: ITimerTaskLog): TaskLog => ({
									task: timeLog.task,
									duration: timeLog.duration || 0,
									description: timeLog.description || ''
								})
							),
							activity: empLog.activity || 0
						})
					)
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

			return {
				date: dayData.date,
				logs,
				sum: totalDuration,
				activity: Math.round(totalActivity / employeeCount)
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
			activityLevel: visibilityMap.get('activityLevel') ?? true
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
		return <ActivityTableSkeleton columnVisibility={columnVisibility} />;
	}

	return (
		<div className="space-y-6 ">
			{currentEntries.map((dayLog: DailyLog) => (
				<div key={dayLog.date} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
					<div className="p-4 border-b border-gray-200 dark:border-gray-600">
						<div className="flex items-center gap-8 text-sm text-gray-500 dark:text-gray-400">
							<div className="text-base ">{format(new Date(dayLog.date), 'EEEE dd MMM yyyy')}</div>
							<div className="flex items-center gap-1.5 border-[1px] border-[#E4E4E7] dark:border-gray-600 rounded-[8px] py-[6px] px-[8px]">
								<span>Hours:</span>
								<span className="font-medium">{formatDuration(dayLog.sum || 0)}</span>
							</div>
							<div className="flex items-center gap-1.5 border-[1px] border-[#E4E4E7] dark:border-gray-600 rounded-[8px] py-[6px] px-[8px]">
								<span>Earnings:</span>
								<span className="font-medium">{(dayLog.earnings || 0).toFixed(2)} USD</span>
							</div>
							<div className="flex items-center gap-1.5 border-[1px] border-[#E4E4E7] dark:border-gray-600 rounded-[8px] py-[6px] px-[8px]">
								<span>Average Activity:</span>
								<span className="font-medium">{dayLog.activity || 0}%</span>
							</div>
						</div>
					</div>
					<Table>
						<TableHeader>
							<TableRow className="border-b border-gray-200 dark:border-gray-600">
								{columnVisibility.member && (
									<TableHead className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap px-6">
										Member ↑
									</TableHead>
								)}
								{columnVisibility.project && (
									<TableHead className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap px-6">
										Project ↑
									</TableHead>
								)}
								{columnVisibility.trackedHours && (
									<TableHead className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap px-6">
										Tracked Hours ↑
									</TableHead>
								)}
								{columnVisibility.earnings && (
									<TableHead className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap px-6">
										Earnings ↑
									</TableHead>
								)}
								{columnVisibility.activityLevel && (
									<TableHead className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap px-6">
										Activity Level ↑
									</TableHead>
								)}
							</TableRow>
						</TableHeader>
						<TableBody>
							{dayLog.logs.flatMap((projectLog) =>
								projectLog.employeeLogs.map((employeeLog) => (
									<TableRow
										key={`${projectLog.project.id}-${employeeLog.employee.id}`}
										className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
									>
										{columnVisibility.member && (
											<TableCell className="px-6 py-4">
												<div className="flex items-center gap-3">
													<Avatar size={32} className="h-8 w-8 rounded-full">
														<img
															src={employeeLog.employee.user.imageUrl}
															alt={employeeLog.employee.fullName}
															className="w-full h-full object-cover  rounded-full"
															loading="lazy"
														/>
													</Avatar>
													<span className="text-gray-900 dark:text-gray-100 font-medium">
														{employeeLog.employee.fullName}
													</span>
												</div>
											</TableCell>
										)}
										{columnVisibility.project && (
											<TableCell className="px-6 py-4">
												<ProjectCell
													imageUrl={projectLog.project.imageUrl}
													name={projectLog.project.name}
												/>
											</TableCell>
										)}
										{columnVisibility.trackedHours && (
											<TableCell className="px-6 py-4">
												<TrackedHoursCell
													duration={employeeLog.sum}
													formatDuration={formatDuration}
												/>
											</TableCell>
										)}
										{columnVisibility.earnings && (
											<TableCell className="px-6 py-4">
												<EarningsCell
													earnings={employeeLog.earnings || employeeLog.sum * 0.5}
												/>
											</TableCell>
										)}
										{columnVisibility.activityLevel && (
											<TableCell className="px-6 py-4">
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
									<TableCell colSpan={5} className="px-6 py-4">
										<div className="flex items-center gap-2 text-gray-400">
											<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
												<path
													d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
													stroke="currentColor"
													strokeWidth="2"
													strokeLinecap="round"
													strokeLinejoin="round"
												/>
											</svg>
											<span>No time activity</span>
										</div>
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			))}

			{/* Pagination controls */}
			<div className="flex justify-between items-center mt-4 px-2">
				<div className="flex items-center gap-4">
					<div className="relative">
						<button
							onClick={() => setShowEntriesDropdown(!showEntriesDropdown)}
							className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-dark--theme border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
						>
							Show {entriesPerPage}
							<svg
								className="w-4 h-4 ml-2 inline-block"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
							</svg>
						</button>
						{showEntriesDropdown && (
							<div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-dark--theme border border-gray-200 dark:border-gray-600 rounded shadow-lg z-10">
								{entryOptions.map((option) => (
									<button
										key={option}
										onClick={() => handleEntriesPerPageChange(option)}
										className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
									>
										Show {option}
									</button>
								))}
							</div>
						)}
					</div>
					<span className="text-sm text-gray-500 dark:text-gray-400">
						Showing {startIndex + 1} to {endIndex} of {transformedData.length} entries
					</span>
				</div>

				<div className="flex items-center gap-2">
					<button
						className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-dark--theme border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
						onClick={() => handlePageChange(1)}
						disabled={currentPage === 1}
					>
						First
					</button>
					<button
						className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-dark--theme border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
						onClick={() => handlePageChange(currentPage - 1)}
						disabled={currentPage === 1}
					>
						Previous
					</button>
					<button
						className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-dark--theme border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
						onClick={() => handlePageChange(currentPage + 1)}
						disabled={currentPage === totalPages}
					>
						Next
					</button>
					<button
						className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-dark--theme border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
						onClick={() => handlePageChange(totalPages)}
						disabled={currentPage === totalPages}
					>
						Last
					</button>
				</div>
			</div>
		</div>
	);
};

export default React.memo(ActivityTable);
