/* eslint-disable @next/next/no-img-element */
import { Avatar } from '@components/ui/avatar';
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ProgressBar from './progress-bar';
import { ViewOption } from './time-activity-header';
import { ITimerLogGrouped, ITimerTask } from '@/app/interfaces';
import { format } from 'date-fns';

interface Project {
	id: string;
	name: string;
	imageUrl: string;
}

interface Employee {
	id: string;
	fullName: string;
	user: {
		imageUrl: string;
	};
}

interface TaskLog {
	task: ITimerTask;
	duration: number;
	description: string;
}

interface EmployeeLog {
	employee: Employee;
	sum: number;
	tasks: TaskLog[];
	activity: number;
}

interface ProjectLog {
	project: Project;
	employeeLogs: EmployeeLog[];
}

interface DailyLog {
	date: string;
	logs: ProjectLog[];
	sum: number;
	activity: number;
}

interface ActivityTableProps {
	rapportDailyActivity: ITimerLogGrouped[] | DailyLog[];
	viewOptions?: ViewOption[];
}

const ActivityTable: React.FC<ActivityTableProps> = ({ rapportDailyActivity, viewOptions = [] }) => {
	const [currentPage, setCurrentPage] = React.useState(1);
	const [entriesPerPage, setEntriesPerPage] = React.useState(10);

	// Check if the data is in the new format
	const isNewFormat = (data: any[]): data is DailyLog[] => {
		return data.length > 0 && 'logs' in data[0];
	};

	// Transform old format to new format if necessary
	const transformedData = React.useMemo(() => {
		if (!rapportDailyActivity || rapportDailyActivity.length === 0) {
			return [];
		}

		if (isNewFormat(rapportDailyActivity)) {
			return rapportDailyActivity;
		}

		// Transform ITimerLogGrouped[] to DailyLog[]
		return (rapportDailyActivity as ITimerLogGrouped[]).map((item): DailyLog => {
			const totalDuration = item.logs.reduce(
				(acc, projectLog) => acc + projectLog.employeeLogs.reduce((empAcc, empLog) => empAcc + empLog.sum, 0),
				0
			);

			const totalActivity =
				item.logs.reduce(
					(acc, projectLog) =>
						acc +
						projectLog.employeeLogs.reduce(
							(empAcc, empLog, _, empLogs) => empAcc + empLog.activity / empLogs.length,
							0
						),
					0
				) / Math.max(1, item.logs.length);

			return {
				date: item.date,
				logs: item.logs.map((log) => ({
					project: {
						id: log.project.id,
						name: log.project.name,
						imageUrl: log.project.imageUrl || '/ever-teams-logo.png'
					},
					employeeLogs: log.employeeLogs.map((empLog) => ({
						employee: {
							id: empLog.employee.id,
							fullName: empLog.employee.fullName,
							user: {
								imageUrl: empLog.employee.user.imageUrl
							}
						},
						sum: empLog.sum,
						tasks: empLog.tasks.map((task) => ({
							task: task.task,
							duration: task.duration,
							description: task.description
						})),
						activity: empLog.activity
					}))
				})),
				sum: totalDuration,
				activity: Math.round(totalActivity)
			};
		});
	}, [rapportDailyActivity]);

	const columnVisibility = React.useMemo(() => {
		const visibilityMap = new Map(viewOptions.map((opt) => [opt.id, opt.checked]));
		return {
			member: visibilityMap.get('member') ?? true,
			project: visibilityMap.get('project') ?? true,
			task: visibilityMap.get('task') ?? true,
			trackedHours: visibilityMap.get('trackedHours') ?? true,
			activityLevel: visibilityMap.get('activityLevel') ?? true
		};
	}, [viewOptions]);

	// Pagination logic
	const totalPages = Math.ceil(transformedData.length / entriesPerPage);
	const paginatedData = transformedData.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

	const formatDuration = (duration: number) => {
		const hours = Math.floor(duration / 3600);
		const minutes = Math.floor((duration % 3600) / 60);
		return `${hours}:${minutes.toString().padStart(2, '0')}h`;
	};

	// Check if any columns are visible
	const hasVisibleColumns = Object.values(columnVisibility).some((visible) => visible);

	if (!hasVisibleColumns) {
		return (
			<div className="flex flex-col items-center justify-center gap-2 w-full min-h-[500px] text-gray-500 dark:text-gray-400">
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					className="w-6 h-6 text-gray-400"
				>
					<path
						d="M3 10H21M7 15H8M12 15H13"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
				<p>Please select at least one column to display</p>
			</div>
		);
	}

	if (!paginatedData || paginatedData.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center gap-2 h-64 text-gray-500 dark:text-gray-400">
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					className="w-6 h-6 text-gray-400"
				>
					<path
						d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
				<p>No activity data available for this period</p>
			</div>
		);
	}

	return (
		<div className="w-full min-h-[500px]">
			{paginatedData.map((dailyLog) => (
				<div key={dailyLog.date} className="mb-8">
					{/* Period Header */}
					<div className="flex flex-col gap-2 px-6 py-3 bg-gray-50/50 dark:bg-dark--theme">
						<div className="text-sm text-gray-900 dark:text-gray-400">
							{format(new Date(dailyLog.date), 'EEEE dd MMM yyyy')}
						</div>
						<div className="flex gap-6 items-center text-sm">
							<div className="flex gap-2 items-center">
								<span className="text-gray-500">Hours:</span>
								<span className="text-gray-900">{formatDuration(dailyLog.sum)}</span>
							</div>
							<div className="flex gap-2 items-center">
								<span className="text-gray-500">Activity:</span>
								<span className="text-gray-900">{dailyLog.activity}%</span>
							</div>
						</div>
					</div>

					{/* Members Table */}
					<div className="overflow-hidden rounded-md transition-all">
						<Table className="w-full">
							<TableHeader>
								<TableRow
									className="border-0 hover:bg-transparent dark:hover:bg-dark--theme-light"
									role="row"
								>
									{columnVisibility.member && (
										<TableHead className="px-6 py-2 text-xs font-medium text-gray-500 transition-colors hover:text-gray-700 dark:hover:text-gray-300">
											Member
										</TableHead>
									)}
									{columnVisibility.project && (
										<TableHead className="px-6 py-2 text-xs font-medium text-gray-500 transition-colors hover:text-gray-700 dark:hover:text-gray-300">
											Project
										</TableHead>
									)}
									{columnVisibility.task && (
										<TableHead className="px-6 py-2 text-xs font-medium text-gray-500 transition-colors hover:text-gray-700 dark:hover:text-gray-300">
											Task
										</TableHead>
									)}
									{columnVisibility.trackedHours && (
										<TableHead className="px-6 py-2 text-xs font-medium text-gray-500 transition-colors hover:text-gray-700 dark:hover:text-gray-300">
											Tracked Hours
										</TableHead>
									)}
									{columnVisibility.activityLevel && (
										<TableHead className="px-6 py-2 text-xs font-medium text-gray-500 transition-colors hover:text-gray-700 dark:hover:text-gray-300">
											Activity Level
										</TableHead>
									)}
								</TableRow>
							</TableHeader>
							<TableBody>
								{dailyLog.logs.flatMap((projectLog) =>
									projectLog.employeeLogs.flatMap((employeeLog) =>
										employeeLog.tasks.map((taskLog) => (
											<TableRow
												key={`${employeeLog.employee.id}-${projectLog.project.id}-${taskLog.task.id}`}
												className="border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
												role="row"
											>
												{columnVisibility.member && (
													<TableCell className="px-6 py-3">
														<div className="flex gap-3 items-center">
															<Avatar className="w-8 h-8 ring-2 ring-offset-2 ring-transparent transition-all hover:ring-primary/20">
																<img
																	src={
																		employeeLog.employee.user.imageUrl ||
																		'/default-avatar.png'
																	}
																	alt={employeeLog.employee.fullName}
																	className="object-cover w-full h-full rounded-full"
																	loading="lazy"
																/>
															</Avatar>
															<span className="text-sm font-medium transition-colors hover:text-primary">
																{employeeLog.employee.fullName}
															</span>
														</div>
													</TableCell>
												)}
												{columnVisibility.project && (
													<TableCell className="px-6 py-3">
														<div className="flex gap-2 items-center">
															<div className="w-6 h-6 rounded-md bg-[#4B4ACF] flex items-center justify-center transition-transform hover:scale-110">
																<img
																	src={projectLog.project.imageUrl}
																	alt={projectLog.project.name}
																	className="w-4 h-4"
																	loading="lazy"
																/>
															</div>
															<span className="text-sm transition-colors hover:text-primary">
																{projectLog.project.name}
															</span>
														</div>
													</TableCell>
												)}
												{columnVisibility.task && (
													<TableCell className="px-6 py-3">
														<span className="text-sm transition-colors hover:text-primary">
															{taskLog.task.title} (#{taskLog.task.taskNumber})
														</span>
													</TableCell>
												)}
												{columnVisibility.trackedHours && (
													<TableCell className="px-6 py-3">
														<span className="text-sm">
															{formatDuration(taskLog.duration)}
														</span>
													</TableCell>
												)}
												{columnVisibility.activityLevel && (
													<TableCell className="px-6 py-3">
														<ProgressBar progress={employeeLog.activity} />
													</TableCell>
												)}
											</TableRow>
										))
									)
								)}
							</TableBody>
						</Table>
					</div>
				</div>
			))}

			{/* Pagination */}
			<div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-dark--theme border-t dark:border-dark--theme-light">
				<div className="flex items-center gap-4">
					<select
						className="px-3 py-2 bg-white dark:bg-dark--theme border border-gray-300 dark:border-dark--theme-light rounded-md text-sm"
						value={entriesPerPage}
						onChange={(e) => setEntriesPerPage(Number(e.target.value))}
					>
						<option value="10">Show 10</option>
						<option value="25">Show 25</option>
						<option value="50">Show 50</option>
					</select>
					<span className="text-sm text-gray-500">
						Showing {(currentPage - 1) * entriesPerPage + 1} to{' '}
						{Math.min(currentPage * entriesPerPage, transformedData.length)} of {transformedData.length}{' '}
						entries
					</span>
				</div>

				<div className="flex items-center gap-2">
					<button
						className="px-3 py-2 border border-gray-300 dark:border-dark--theme-light rounded-md text-sm disabled:opacity-50"
						onClick={() => setCurrentPage(1)}
						disabled={currentPage === 1}
					>
						First
					</button>
					<button
						className="px-3 py-2 border border-gray-300 dark:border-dark--theme-light rounded-md text-sm disabled:opacity-50"
						onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
						disabled={currentPage === 1}
					>
						Previous
					</button>
					{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
						const pageNum = currentPage + i - 2;
						if (pageNum < 1 || pageNum > totalPages) return null;
						return (
							<button
								key={pageNum}
								className={`px-3 py-2 border rounded-md text-sm ${
									pageNum === currentPage
										? 'bg-primary text-white border-primary'
										: 'border-gray-300 dark:border-dark--theme-light'
								}`}
								onClick={() => setCurrentPage(pageNum)}
							>
								{pageNum}
							</button>
						);
					})}
					<button
						className="px-3 py-2 border border-gray-300 dark:border-dark--theme-light rounded-md text-sm disabled:opacity-50"
						onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
						disabled={currentPage === totalPages}
					>
						Next
					</button>
					<button
						className="px-3 py-2 border border-gray-300 dark:border-dark--theme-light rounded-md text-sm disabled:opacity-50"
						onClick={() => setCurrentPage(totalPages)}
						disabled={currentPage === totalPages}
					>
						Last
					</button>
				</div>
			</div>
		</div>
	);
};

export default ActivityTable;
