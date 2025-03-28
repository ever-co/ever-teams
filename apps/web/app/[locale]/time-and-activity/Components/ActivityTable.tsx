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

	return (
		<div className="space-y-4">
			{paginatedData.map((dayLog, index) => (
				<div key={index} className="bg-white dark:bg-dark-2 rounded-lg shadow">
					<div className="p-4 border-b border-gray-200 dark:border-dark-3">
						<div className="flex justify-between items-center">
							<div className="text-sm text-gray-500 dark:text-gray-400">
								{format(new Date(dayLog.date), 'EEEE dd MMM yyyy')}
							</div>
							<div className="flex gap-4">
								<div className="text-sm">
									Hours: <span className="font-medium">{formatDuration(dayLog.sum)}</span>
								</div>
								{columnVisibility.earnings && (
									<div className="text-sm">
										Earnings: <span className="font-medium">{dayLog.earnings?.toFixed(2)} USD</span>
									</div>
								)}
								{columnVisibility.activityLevel && (
									<div className="text-sm">
										Average Activity: <span className="font-medium">{dayLog.activity}%</span>
									</div>
								)}
							</div>
						</div>
					</div>
					<Table>
						<TableHeader>
							<TableRow>
								{columnVisibility.project && <TableHead>Project</TableHead>}
								{columnVisibility.task && <TableHead>Task</TableHead>}
								{columnVisibility.trackedHours && <TableHead>Tracked Hours</TableHead>}
								{columnVisibility.earnings && <TableHead>Earnings</TableHead>}
								{columnVisibility.activityLevel && <TableHead>Activity Level</TableHead>}
							</TableRow>
						</TableHeader>
						<TableBody>
							{dayLog.logs.flatMap((projectLog) =>
								projectLog.employeeLogs.flatMap((employeeLog) =>
									employeeLog.tasks.map((taskLog, taskIndex) => (
										<TableRow key={`${projectLog.project.id}-${taskIndex}`}>
											{columnVisibility.project && (
												<TableCell>
													<div className="flex items-center gap-2">
														<Avatar className="w-6 h-6 rounded">
															<img
																src={projectLog.project.imageUrl}
																alt={projectLog.project.name}
																className="w-full h-full object-cover"
															/>
														</Avatar>
														<span>{projectLog.project.name}</span>
													</div>
												</TableCell>
											)}
											{columnVisibility.task && (
												<TableCell>
													<div className="flex items-center gap-2">
														<span>#{taskLog.task.taskNumber}</span>
														<span>{taskLog.task.title}</span>
													</div>
												</TableCell>
											)}
											{columnVisibility.trackedHours && (
												<TableCell>
													<div className="flex items-center gap-2">
														<span>{formatDuration(taskLog.duration)}</span>
													</div>
												</TableCell>
											)}
											{columnVisibility.earnings && (
												<TableCell>
													<div className="flex items-center gap-2">
														<span>{taskLog.earnings?.toFixed(2)} USD</span>
													</div>
												</TableCell>
											)}
											{columnVisibility.activityLevel && (
												<TableCell>
													<div className="flex items-center gap-2">
														<ProgressBar progress={employeeLog.activity} />
														<span>{employeeLog.activity}%</span>
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
				<div className="flex items-center gap-2">
					<select
						className="border rounded px-2 py-1"
						value={entriesPerPage}
						onChange={(e) => setEntriesPerPage(Number(e.target.value))}
					>
						<option value={10}>Show 10</option>
						<option value={25}>Show 25</option>
						<option value={50}>Show 50</option>
					</select>
					<span className="text-sm text-gray-500">
						Showing 1 to {Math.min(entriesPerPage, transformedData.length)} of {transformedData.length}{' '}
						entries
					</span>
				</div>
				<div className="flex gap-2">
					<button
						className="px-3 py-1 border rounded disabled:opacity-50"
						onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
						disabled={currentPage === 1}
					>
						Previous
					</button>
					{Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
						<button
							key={page}
							className={`px-3 py-1 border rounded ${
								page === currentPage ? 'bg-blue-500 text-white' : ''
							}`}
							onClick={() => setCurrentPage(page)}
						>
							{page}
						</button>
					))}
					<button
						className="px-3 py-1 border rounded disabled:opacity-50"
						onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
						disabled={currentPage === totalPages}
					>
						Next
					</button>
				</div>
			</div>
		</div>
	);
};

export default ActivityTable;
