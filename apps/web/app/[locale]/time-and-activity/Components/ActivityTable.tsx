/* eslint-disable @next/next/no-img-element */
import { Avatar } from '@components/ui/avatar';
import React, { useState } from 'react';
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
	earnings?: number;
}

interface EmployeeLog {
	employee: Employee;
	sum: number;
	tasks: TaskLog[];
	activity: number;
	earnings?: number;
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
	earnings?: number;
}

interface ActivityTableProps {
	rapportDailyActivity: ITimerLogGrouped[] | DailyLog[];
	viewOptions?: ViewOption[];
}

const ActivityTable: React.FC<ActivityTableProps> = ({ rapportDailyActivity, viewOptions = [] }) => {
	const [currentPage, setCurrentPage] = useState(1);
	const [entriesPerPage, setEntriesPerPage] = useState(10);
	const [showEntriesDropdown, setShowEntriesDropdown] = useState(false);

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
							description: task.description,
							earnings: 160.0 // Example fixed value as shown in the image
						})),
						activity: empLog.activity,
						earnings: 160.0 // Example fixed value as shown in the image
					}))
				})),
				sum: totalDuration,
				activity: Math.round(totalActivity),
				earnings: 2000.0 // Example fixed value as shown in the image for the day
			};
		});
	}, [rapportDailyActivity]);

	const columnVisibility = React.useMemo(() => {
		const visibilityMap = new Map(viewOptions.map((opt) => [opt.id, opt.checked]));
		return {
			project: visibilityMap.get('project') ?? true,
			task: visibilityMap.get('task') ?? true,
			trackedHours: visibilityMap.get('trackedHours') ?? true,
			earnings: visibilityMap.get('earnings') ?? true,
			activityLevel: visibilityMap.get('activityLevel') ?? true
		};
	}, [viewOptions]);

	// Calculate pagination values
	const totalPages = Math.ceil(transformedData.length / entriesPerPage);
	const startIndex = (currentPage - 1) * entriesPerPage;
	const endIndex = Math.min(startIndex + entriesPerPage, transformedData.length);
	const currentEntries = transformedData.slice(startIndex, endIndex);

	// Entry options for the dropdown
	const entryOptions = [10, 25, 50];

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

	return (
		<div className="space-y-4">
			{currentEntries.map((dayLog, index) => (
				<div key={index} className="bg-white rounded-lg border border-gray-200">
					<div className="p-4 border-b border-gray-200">
						<div className="flex flex-col gap-2">
							<div className="text-base text-gray-900">
								{format(new Date(dayLog.date), 'EEEE dd MMM yyyy')}
							</div>
							<div className="flex gap-6 text-sm text-gray-600">
								<span>Hours: {formatDuration(dayLog.sum)}</span>
								{columnVisibility.earnings && (
									<span>Earnings: {dayLog.earnings?.toFixed(2)} USD</span>
								)}
								<span>Average Activity: {dayLog.activity}%</span>
							</div>
						</div>
					</div>
					<Table>
						<TableHeader>
							<TableRow>
								{columnVisibility.project && (
									<TableHead className="text-sm font-medium text-gray-500">Project</TableHead>
								)}
								{columnVisibility.task && (
									<TableHead className="text-sm font-medium text-gray-500">Task</TableHead>
								)}
								{columnVisibility.trackedHours && (
									<TableHead className="text-sm font-medium text-gray-500">Tracked Hours</TableHead>
								)}
								{columnVisibility.earnings && (
									<TableHead className="text-sm font-medium text-gray-500">Earnings</TableHead>
								)}
								{columnVisibility.activityLevel && (
									<TableHead className="text-sm font-medium text-gray-500">Activity Level</TableHead>
								)}
							</TableRow>
						</TableHeader>
						<TableBody>
							{dayLog.logs.flatMap((projectLog) =>
								projectLog.employeeLogs.flatMap((employeeLog) =>
									employeeLog.tasks.map((taskLog, taskIndex) => (
										<TableRow
											key={`${projectLog.project.id}-${taskIndex}`}
											className="hover:bg-gray-50"
										>
											{columnVisibility.project && (
												<TableCell>
													<div className="flex items-center gap-3">
														<Avatar className="w-8 h-8 rounded">
															<img
																src={projectLog.project.imageUrl}
																alt={projectLog.project.name}
																className="w-full h-full object-cover rounded"
															/>
														</Avatar>
														<span className="text-gray-900">{projectLog.project.name}</span>
													</div>
												</TableCell>
											)}
											{columnVisibility.task && (
												<TableCell>
													<div className="flex items-center gap-2">
														<span className="text-gray-500">#{taskLog.task.taskNumber}</span>
														<span className="text-gray-900">{taskLog.task.title}</span>
													</div>
												</TableCell>
											)}
											{columnVisibility.trackedHours && (
												<TableCell>
													<div className="flex items-center">
														<span className="text-gray-900">{formatDuration(taskLog.duration)}</span>
													</div>
												</TableCell>
											)}
											{columnVisibility.earnings && (
												<TableCell>
													<div className="flex items-center">
														<span className="text-gray-900">{taskLog.earnings?.toFixed(2)} USD</span>
													</div>
												</TableCell>
											)}
											{columnVisibility.activityLevel && (
												<TableCell>
													<div className="flex items-center gap-3">
														<div className="flex-1 max-w-[120px]">
															<ProgressBar progress={employeeLog.activity} />
														</div>
														<span className="text-gray-900">{employeeLog.activity}%</span>
													</div>
												</TableCell>
											)}
										</TableRow>
									))
								)
							)}
						</TableBody>
					</Table>
				</div>
			))}

			{/* Pagination controls */}
			<div className="flex justify-between items-center mt-4">
				<div className="flex items-center gap-4">
					<div className="relative">
						<button
							onClick={() => setShowEntriesDropdown(!showEntriesDropdown)}
							className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
						>
							Show {entriesPerPage}
							<svg
								className="w-4 h-4 ml-2 inline-block"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M19 9l-7 7-7-7"
								/>
							</svg>
						</button>
						{showEntriesDropdown && (
							<div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg z-10">
								{entryOptions.map((option) => (
									<button
										key={option}
										onClick={() => {
											setEntriesPerPage(option);
											setShowEntriesDropdown(false);
										}}
										className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
									>
										Show {option}
									</button>
								))}
							</div>
						)}
					</div>
					<span className="text-sm text-gray-500">
						Showing {startIndex + 1} to {endIndex} of {transformedData.length} entries
					</span>
				</div>
				<div className="flex gap-2">
					<button
						className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
						onClick={() => setCurrentPage(1)}
						disabled={currentPage === 1}
					>
						First
					</button>
					<button
						className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
						onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
						disabled={currentPage === 1}
					>
						Previous
					</button>
					<div className="relative">
						<button
							className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
							onClick={() => setShowEntriesDropdown(false)}
						>
							Page {currentPage} of {totalPages}
						</button>
					</div>
					<button
						className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
						onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
						disabled={currentPage === totalPages}
					>
						Next
					</button>
					<button
						className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
