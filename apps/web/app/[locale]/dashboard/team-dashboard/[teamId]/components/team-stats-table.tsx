'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ITimerLogGrouped } from '@/app/interfaces';
import { Spinner } from '@/components/ui/loaders/spinner';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useState } from 'react';

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

const ITEMS_PER_PAGE = 10;

export function TeamStatsTable({ rapportDailyActivity, isLoading }: { rapportDailyActivity?: ITimerLogGrouped[], isLoading?: boolean }) {
	const [currentPage, setCurrentPage] = useState(1);
	const totalPages = rapportDailyActivity ? Math.ceil(rapportDailyActivity.length / ITEMS_PER_PAGE) : 0;
	const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
	const endIndex = startIndex + ITEMS_PER_PAGE;

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
							<TableHead>Member</TableHead>
							<TableHead>Total Time</TableHead>
							<TableHead>Tracked</TableHead>
							<TableHead>Manually Added</TableHead>
							<TableHead>Active Time</TableHead>
							<TableHead>Idle Time</TableHead>
							<TableHead>Unknown Activity</TableHead>
							<TableHead>Activity Level</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{paginatedData?.map((dayData) => (
							<div key={dayData.date}>
								<TableRow key={dayData.date} className="bg-gray-50 dark:bg-gray-700">
									<TableCell colSpan={8} className="font-medium">
										{format(new Date(dayData.date), 'EEEE dd MMM yyyy')}
									</TableCell>
								</TableRow>
								{dayData.logs?.map((projectLog) => (
									projectLog.employeeLogs?.map((employeeLog) => (
										<TableRow key={employeeLog.employee?.id}>
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
											<TableCell>{formatDuration(employeeLog.sum || 0)}</TableCell>
											<TableCell>{formatPercentage(employeeLog.activity)}</TableCell>
											<TableCell>{formatPercentage(0)}</TableCell>
											<TableCell className="text-green-500">{formatPercentage(100)}</TableCell>
											<TableCell className="text-gray-500">{formatPercentage(0)}</TableCell>
											<TableCell className="text-gray-500">{formatPercentage(0)}</TableCell>
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
								)) || []}
							</div>
						))}
					</TableBody>
				</Table>
			</div>
			<div className="flex justify-between items-center px-2">
				<div className="flex items-center space-x-6">
					<p className="text-sm text-gray-500">
						Showing {startIndex + 1} to {Math.min(endIndex, rapportDailyActivity.length)} of {rapportDailyActivity.length} entries
					</p>
				</div>
				<div className="flex items-center space-x-2">
					<Button
						variant="outline"
						size="icon"
						onClick={goToFirstPage}
						disabled={currentPage === 1}
					>
						<ChevronsLeft className="w-4 h-4" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						onClick={goToPreviousPage}
						disabled={currentPage === 1}
					>
						<ChevronLeft className="w-4 h-4" />
					</Button>
					<div className="flex gap-1 items-center">
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
		</div>
	);
}
