/* eslint-disable @next/next/no-img-element */
import { Avatar } from '@components/ui/avatar';
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ProgressBar from './progress-bar';
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
}

const ActivityTable: React.FC<ActivityTableProps> = ({ rapportDailyActivity }) => {
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
							earnings: 160.0
						})),
						activity: empLog.activity,
						earnings: 160.0
					}))
				})),
				sum: totalDuration,
				activity: Math.round(totalActivity),
				earnings: 2000.0
			};
		});
	}, [rapportDailyActivity]);

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

	return (
		<div className="space-y-6">
			{currentEntries.map((dayLog, index) => (
				<div key={index} className="bg-white dark:bg-dark--theme rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
					<div className="p-4 border-b border-gray-200 dark:border-gray-600">
						<div className="flex flex-col gap-1.5">
							<div className="text-base font-medium text-gray-900 dark:text-gray-100">
								{format(new Date(dayLog.date), 'EEEE dd MMM yyyy')}
							</div>
							<div className="flex items-center gap-8 text-sm text-gray-500 dark:text-gray-400">
								<div className="flex items-center gap-1.5">
									<span className="font-medium">Hours:</span>
									<span>{formatDuration(dayLog.sum)}</span>
								</div>
								<div className="flex items-center gap-1.5">
									<span className="font-medium">Earnings:</span>
									<span>{dayLog.earnings?.toFixed(2)} USD</span>
								</div>
								<div className="flex items-center gap-1.5">
									<span className="font-medium">Average Activity:</span>
									<span>{dayLog.activity}%</span>
								</div>
							</div>
						</div>
					</div>
					<Table>
						<TableHeader>
							<TableRow className="border-b border-gray-200 dark:border-gray-600">
								<TableHead className="text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap px-6">
									Member ↑
								</TableHead>
								<TableHead className="text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap px-6">
									Project ↑
								</TableHead>
								<TableHead className="text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap px-6">
									Tracked Hours ↑
								</TableHead>
								<TableHead className="text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap px-6">
									Earnings ↑
								</TableHead>
								<TableHead className="text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap px-6">
									Activity Level ↑
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{dayLog.logs.flatMap((projectLog) =>
								projectLog.employeeLogs.map((employeeLog, empIndex) => (
									<TableRow key={`${projectLog.project.id}-${empIndex}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
										<TableCell className="px-6 py-4">
											<div className="flex items-center gap-3">
												<Avatar className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600">
													<img
														src={employeeLog.employee.user.imageUrl}
														alt={employeeLog.employee.fullName}
														className="w-full h-full object-cover rounded-full"
													/>
												</Avatar>
												<span className="text-gray-900 dark:text-gray-100">
													{employeeLog.employee.fullName}
												</span>
											</div>
										</TableCell>
										<TableCell className="px-6 py-4">
											<div className="flex items-center gap-3">
												<Avatar className="w-8 h-8 rounded border border-gray-200 dark:border-gray-600">
													<img
														src={projectLog.project.imageUrl}
														alt={projectLog.project.name}
														className="w-full h-full object-cover rounded"
													/>
												</Avatar>
												<span className="text-gray-900 dark:text-gray-100">{projectLog.project.name}</span>
											</div>
										</TableCell>
										<TableCell className="px-6 py-4">
											<div className="flex items-center gap-2">
												<div className="w-3 h-3 rounded-full bg-green-500"></div>
												<span className="text-gray-900 dark:text-gray-100">{formatDuration(employeeLog.sum)}</span>
											</div>
										</TableCell>
										<TableCell className="px-6 py-4">
											<div className="flex items-center">
												<span className="text-gray-900 dark:text-gray-100">
													{employeeLog.earnings?.toFixed(2)} USD
												</span>
											</div>
										</TableCell>
										<TableCell className="px-6 py-4">
											<div className="flex items-center gap-3">
												<div className="flex-1 max-w-[120px]">
													<ProgressBar progress={employeeLog.activity} />
												</div>
												<span className="text-gray-900 dark:text-gray-100 w-8">{employeeLog.activity}%</span>
											</div>
										</TableCell>
									</TableRow>
								))
							)}
							{dayLog.logs.some((log) => log.employeeLogs.some((empLog) => empLog.sum === 0)) && (
								<TableRow>
									<TableCell colSpan={5} className="px-6 py-4">
										<div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
											<svg
												className="w-4 h-4"
												viewBox="0 0 24 24"
												fill="none"
												xmlns="http://www.w3.org/2000/svg"
											>
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
			<div className="flex justify-between items-center mt-4">
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
								xmlns="http://www.w3.org/2000/svg"
							>
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
							</svg>
						</button>
						{showEntriesDropdown && (
							<div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-dark--theme border border-gray-200 dark:border-gray-600 rounded shadow-lg z-10">
								{entryOptions.map((option) => (
									<button
										key={option}
										onClick={() => {
											setEntriesPerPage(option);
											setShowEntriesDropdown(false);
										}}
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
				<div className="flex gap-2">
					<button
						className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-dark--theme border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
						onClick={() => setCurrentPage(1)}
						disabled={currentPage === 1}
					>
						First
					</button>
					<button
						className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-dark--theme border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
						onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
						disabled={currentPage === 1}
					>
						Previous
					</button>
					<div className="relative">
						<button
							className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-dark--theme border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
							onClick={() => setShowEntriesDropdown(false)}
						>
							Page {currentPage} of {totalPages}
						</button>
					</div>
					<button
						className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-dark--theme border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
						onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
						disabled={currentPage === totalPages}
					>
						Next
					</button>
					<button
						className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-dark--theme border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
