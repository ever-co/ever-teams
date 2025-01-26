'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ITimerLogGrouped } from '@/app/interfaces';
import { Spinner } from '@/components/ui/loaders/spinner';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

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

export function TeamStatsTable({ rapportDailyActivity, isLoading }: { rapportDailyActivity?: ITimerLogGrouped[], isLoading?: boolean }) {
	if (isLoading) {
		return (
			<div className="flex justify-center items-center min-h-[400px]">
				<Spinner />
			</div>
		);
	}

	if (!rapportDailyActivity?.length) {
		return (
			<div className="flex justify-center items-center min-h-[400px] text-gray-500">
				No data available
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="overflow-auto relative w-full">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Employee</TableHead>
							<TableHead>Project</TableHead>
							<TableHead>Task</TableHead>
							<TableHead>Duration</TableHead>
							<TableHead>Activity</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rapportDailyActivity.map((dayData) => (
							<>
								<TableRow key={dayData.date} className="bg-gray-50 dark:bg-gray-700">
									<TableCell colSpan={5} className="font-medium">
										{format(new Date(dayData.date), 'PPP')}
									</TableCell>
								</TableRow>
								{dayData.logs?.map((projectLog) => (
									projectLog.employeeLogs?.map((employeeLog) => (
										employeeLog.tasks?.map((task) => (
											<TableRow key={`${employeeLog.employee?.id}-${task.task?.id}`}>
												<TableCell className="font-medium">
													<div className="flex gap-2 items-center">
														<Avatar className="w-8 h-8">
															<AvatarImage
																src={employeeLog.employee?.user?.imageUrl || ''}
																alt={employeeLog.employee?.user?.name || 'User'}
															/>
															<AvatarFallback>
																{employeeLog.employee?.user?.name?.[0] || 'U'}
															</AvatarFallback>
														</Avatar>
														{employeeLog.employee?.user?.name || 'Unknown User'}
													</div>
												</TableCell>
												<TableCell>{projectLog.project?.name || 'Unknown Project'}</TableCell>
												<TableCell>{task.task?.title || 'Unknown Task'}</TableCell>
												<TableCell>{formatDuration(task.duration || 0)}</TableCell>
												<TableCell>
													<div className="flex gap-2 items-center">
														<div className="w-full h-2 bg-gray-100 rounded-full dark:bg-gray-600">
															<div
																className={`h-full rounded-full ${getProgressColor(employeeLog.activity || 0)}`}
																style={{ width: `${employeeLog.activity || 0}%` }}
															/>
														</div>
														<span className="w-12 text-sm">{(employeeLog.activity || 0).toFixed(1)}%</span>
													</div>
												</TableCell>
											</TableRow>
										)) || []
									)) || []
								)) || []}
							</>
						))}
					</TableBody>
				</Table>
			</div>
			<div className="flex justify-between items-center px-2">
				<div className="flex items-center space-x-6">
					<p className="text-sm text-gray-500">
						Showing 1 to {rapportDailyActivity.length} of {rapportDailyActivity.length} entries
					</p>
				</div>
				<div className="flex items-center space-x-2">
					<Button variant="outline" size="icon" disabled>
						<ChevronsLeft className="w-4 h-4" />
					</Button>
					<Button variant="outline" size="icon" disabled>
						<ChevronLeft className="w-4 h-4" />
					</Button>
					<Button variant="outline" size="sm">
						1
					</Button>
					<Button variant="outline" size="icon">
						<ChevronRight className="w-4 h-4" />
					</Button>
					<Button variant="outline" size="icon">
						<ChevronsRight className="w-4 h-4" />
					</Button>
				</div>
			</div>
		</div>
	);
}
