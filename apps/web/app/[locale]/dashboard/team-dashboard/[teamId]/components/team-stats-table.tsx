'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PaginationDropdown } from '@/lib/settings/page-dropdown';
import { format } from 'date-fns';
import { ITimerEmployeeLog, ITimerLogGrouped } from '@/app/interfaces';
import { Spinner } from '@/components/ui/loaders/spinner';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Fragment, useState } from 'react';
import { ChartIcon } from './team-icon';
import { ActivityModal } from './activity-modal';
import { useModal } from '@/app/hooks';

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


	const [employeeLog, setEmployeeLog] = useState<ITimerEmployeeLog | undefined>(undefined);
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const totalPages = rapportDailyActivity ? Math.ceil(rapportDailyActivity.length / pageSize) : 0;
	const startIndex = (currentPage - 1) * pageSize;
	const endIndex = startIndex + pageSize;
	const { openModal, closeModal, isOpen } = useModal();
	const paginatedData = rapportDailyActivity?.slice(startIndex, endIndex);

	const goToPage = (page: number) => {
		setCurrentPage(page);
	};

	const goToFirstPage = () => goToPage(1);
	const goToLastPage = () => goToPage(totalPages);
	const goToPreviousPage = () => goToPage(Math.max(1, currentPage - 1));
	const goToNextPage = () => goToPage(Math.min(totalPages, currentPage + 1));

	if (isLoading) {
		return (
			<div className="flex justify-center items-center min-h-[500px] dark:bg-dark--theme-light">
				<Spinner />
			</div>
		);
	}

	if (!rapportDailyActivity?.length) {
		return (
			<div className="flex justify-center items-center min-h-[400px] text-gray-500 dark:text-white dark:bg-dark--theme-light">
				No data available
			</div>
		);
	}

	return (
		<>
			{employeeLog && (
				<ActivityModal employeeLog={employeeLog} isOpen={isOpen} closeModal={closeModal} />
			)}
			<div className="min-h-[500px] w-full dark:bg-dark--theme-light">
				<div className="relative rounded-md border">
					<div className="overflow-x-auto">
						<div className="inline-block min-w-full align-middle">
							<div className="overflow-hidden">
								<Table className="w-full">
									<TableHeader>
										<TableRow className="font-normal text-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-gray-200">
											<TableHead className="w-[320px] py-3">Member</TableHead>
											<TableHead className="w-[100px]">Total Time</TableHead>
											<TableHead className="w-[80px]">Tracked</TableHead>
											<TableHead className="w-[120px]">Manually Added</TableHead>
											<TableHead className="w-[100px]">Active Time</TableHead>
											<TableHead className="w-[80px]">Idle Time</TableHead>
											<TableHead className="w-[120px]">Unknown Activity</TableHead>
											<TableHead className="w-[200px]">Activity Level</TableHead>
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
																			title="View activity chart">
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
				<div className="flex flex-col gap-4 justify-between items-center px-2 sm:flex-row">
					<div className="text-sm text-center text-gray-500 sm:text-left">
						Showing {startIndex + 1} to {Math.min(endIndex, rapportDailyActivity.length)} of{' '}
						{rapportDailyActivity.length} entries
					</div>
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
				</div>
				<div className="flex gap-4 items-center">
					<PaginationDropdown
						setValue={(value) => {
							setPageSize(value);
							setCurrentPage(1);
						}}
						total={rapportDailyActivity?.length}
					/>
					<div className="text-sm text-center text-[#111827] sm:text-left">
						Showing {startIndex + 1} to {Math.min(endIndex, rapportDailyActivity?.length || 0)} of{' '}
						{rapportDailyActivity?.length || 0} entries
					</div>
				</div>
			</div>
		</>
	);
}
