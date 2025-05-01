'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/core/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/ui/table';
import { Skeleton } from '@/core/components/ui/skeleton';
import { Card } from '@/core/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/core/components/ui/tooltip';
import React from 'react';
import { EmptyState } from '../productivity-project/states';
import { useTranslations } from 'next-intl';
import { usePagination } from '@/core/hooks/features/usePagination';
import { Paginate } from '@/core/components';

// Constants
const TABLE_HEADERS = ['Date', 'Project', 'Activity', 'Time Spent', 'Percent used'] as const;

// Utility functions
const formatDuration = (seconds: number): string => {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

const getInitials = (name: string): string =>
	name
		.split(' ')
		.map((n) => n?.[0] || '')
		.join('')
		.toUpperCase();

const formatDate = (dateStr: string): string => {
	const date = new Date(dateStr);
	return date.toLocaleDateString('en-US', {
		weekday: 'long',
		day: '2-digit',
		month: 'long',
		year: 'numeric'
	});
};

const calculateTotalDuration = (activities: IActivityItem[]): number => {
	return activities.reduce((total, activity) => {
		const duration = parseInt(activity.duration || '0');
		return isNaN(duration) ? total : total + duration;
	}, 0);
};

export interface IUserImage {
	id: string;
	url: string;
	fullUrl: string;
	thumbUrl: string;
}

export interface IUser {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	imageUrl: string;
	name: string;
	image?: IUserImage;
}

export interface IEmployee {
	id: string;
	fullName: string;
	isActive: boolean;
	isTrackingEnabled: boolean;
	user: IUser;
}

export interface IActivityItem {
	sessions: string;
	duration: string;
	employeeId: string;
	projectId: string | null;
	date: string;
	title: string;
	employee: IEmployee;
	duration_percentage: string;
	projectName?: string;
}

export interface IDateGroup {
	date: string;
	employees: Array<{
		employee: IEmployee;
		projects: Array<{
			activity: IActivityItem[];
		}>;
	}>;
}

export interface Props {
	data?: IDateGroup[] | any[];
	isLoading?: boolean;
}

// Components
const TableLoadingSkeleton: React.FC = () => (
	<Card className="bg-white rounded-md border border-gray-100 dark:border-gray-700 dark:bg-dark--theme-light min-h-[600px]">
		<Table>
			<TableHeader>
				<TableRow>
					{TABLE_HEADERS.map((header) => (
						<TableHead key={header}>{header}</TableHead>
					))}
				</TableRow>
			</TableHeader>
			<TableBody>
				{Array.from({ length: 7 }).map((_, i) => (
					<TableRow key={i}>
						<TableCell>
							<div className="flex gap-2 items-center">
								<Skeleton className="w-8 h-8 rounded-full" />
								<Skeleton className="w-24 h-4" />
							</div>
						</TableCell>
						<TableCell>
							<Skeleton className="w-24 h-4" />
						</TableCell>
						<TableCell>
							<Skeleton className="w-24 h-4" />
						</TableCell>
						<TableCell>
							<Skeleton className="w-16 h-4" />
						</TableCell>
						<TableCell>
							<Skeleton className="w-full h-4" />
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	</Card>
);

const EmployeeAvatar: React.FC<{ employee: IEmployee }> = React.memo(({ employee }) => (
	<Avatar className="w-8 h-8">
		<AvatarImage src={employee.user.imageUrl} alt={employee.fullName} />
		<AvatarFallback className="dark:text-gray-300">{getInitials(employee.fullName)}</AvatarFallback>
	</Avatar>
));

EmployeeAvatar.displayName = 'EmployeeAvatar';

const ProjectLogo: React.FC = React.memo(() => (
	<div className="w-8 h-8 rounded-md bg-[#422AFB] flex items-center justify-center text-white text-xs">Ever</div>
));

ProjectLogo.displayName = 'ProjectLogo';

const ActivityBar: React.FC<{ percentage: string; title: string }> = React.memo(({ percentage, title }) => (
	<TooltipProvider>
		<Tooltip>
			<TooltipTrigger asChild>
				<div className="flex flex-1 gap-2 items-center">
					<div className="overflow-hidden flex-1 h-2 bg-[#EDF2F7] rounded-full dark:bg-gray-700">
						<div className="h-full bg-[#422AFB] rounded-full" style={{ width: `${percentage}%` }} />
					</div>
					<span className="w-8 text-sm text-gray-600 dark:text-gray-400">
						{Math.round(parseFloat(percentage))}%
					</span>
				</div>
			</TooltipTrigger>
			<TooltipContent>
				<p>
					{title}: {Math.round(parseFloat(percentage))}% of total time
				</p>
			</TooltipContent>
		</Tooltip>
	</TooltipProvider>
));

ActivityBar.displayName = 'ActivityBar';

interface ActivityRowProps {
	date: string;
	activity: {
		title: string;
		duration: string;
		duration_percentage: string;
		projectName?: string;
	};
	isFirstOfDay: boolean;
}

const ActivityRow: React.FC<ActivityRowProps> = React.memo(({ date, activity, isFirstOfDay }) => (
	<TableRow className="hover:bg-gray-50 dark:hover:bg-gray-800">
		<TableCell className="font-medium text-gray-600">{isFirstOfDay ? formatDate(date) : ''}</TableCell>
		<TableCell>
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<div className="flex gap-2 items-center">
							<ProjectLogo />
							<span className="font-medium text-gray-700 dark:text-gray-300">
								{activity.projectName || 'No project'}
							</span>
						</div>
					</TooltipTrigger>
					<TooltipContent>
						<p>Project: {activity.projectName || 'No project'}</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		</TableCell>
		<TableCell>
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<span>{activity.title || 'No activity'}</span>
					</TooltipTrigger>
					<TooltipContent>
						<p>Activity: {activity.title || 'No activity'}</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		</TableCell>
		<TableCell className="font-medium text-gray-600 dark:text-gray-300">
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<span>{formatDuration(parseInt(activity.duration))}</span>
					</TooltipTrigger>
					<TooltipContent>
						<p>Time spent: {formatDuration(parseInt(activity.duration))}</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		</TableCell>
		<TableCell>
			<ActivityBar percentage={activity.duration_percentage} title={activity.title} />
		</TableCell>
	</TableRow>
));

ActivityRow.displayName = 'ActivityRow';

const MemoizedActivityRow: React.FC<{
	activity: IActivityItem;
	date: string;
	isFirstOfDay: boolean;
}> = React.memo(({ activity, date, isFirstOfDay }) => {
	const activityProps = React.useMemo(
		() => ({
			title: activity.title,
			duration: activity.duration,
			duration_percentage: activity.duration_percentage,
			projectName: activity.projectName
		}),
		[activity.title, activity.duration, activity.duration_percentage, activity.projectName]
	);

	return <ActivityRow date={date} activity={activityProps} isFirstOfDay={isFirstOfDay} />;
});

MemoizedActivityRow.displayName = 'MemoizedActivityRow';

export const ProductivityEmployeeTable: React.FC<Props> = ({ data = [], isLoading }) => {
	const t = useTranslations();

	const { total, onPageChange, itemsPerPage, itemOffset, endOffset, setItemsPerPage, currentItems } =
		usePagination<any>(data || []);

	const groupedData = React.useMemo(() => {
		const paginatedData = currentItems;
		const employeeMap = new Map<
			string,
			{
				employee: IEmployee;
				dateGroups: Map<
					string,
					{
						activities: IActivityItem[];
						totalDuration: number;
					}
				>;
			}
		>();

		try {
			paginatedData.forEach((employeeData) => {
				if (!employeeData?.employee?.id || !employeeData?.dates) {
					console.warn('Invalid employee data:', employeeData);
					return;
				}

				const { employee, dates } = employeeData;

				// Get or create employee group
				if (!employeeMap.has(employee.id)) {
					employeeMap.set(employee.id, {
						employee: {
							...employee,
							fullName:
								employee.fullName ||
								`${employee.user?.firstName || ''} ${employee.user?.lastName || ''}`.trim() ||
								'Unknown'
						},
						dateGroups: new Map()
					});
				}

				const employeeGroup = employeeMap.get(employee.id)!;

				// Process each date
				dates.forEach((dateGroup: unknown | any) => {
					if (!dateGroup?.date || !Array.isArray(dateGroup.projects)) {
						console.warn('Invalid date group:', dateGroup);
						return;
					}

					const date = dateGroup.date;
					const activities = dateGroup.projects
						.filter((project: unknown | any) => project && Array.isArray(project.activity))
						.flatMap((project: unknown | any) => project.activity)
						.filter((activity: unknown | any) => activity && typeof activity === 'object');

					if (activities.length > 0) {
						const totalDuration = calculateTotalDuration(activities);
						employeeGroup.dateGroups.set(date, {
							activities,
							totalDuration
						});
					}
				});
			});
		} catch (error) {
			console.error('Error grouping productivity data:', error);
		}

		return employeeMap;
	}, [data]);

	if (isLoading) {
		return <TableLoadingSkeleton />;
	}

	if (!data.length) {
		const selectedDate = new Date().toISOString().split('T')[0];
		return <EmptyState selectedDate={selectedDate} t={t} />;
	}

	const employeeList = Array.from(groupedData.values());

	return (
		<Card className="bg-white rounded-md border border-gray-100 dark:border-gray-700 dark:bg-dark--theme-light min-h-[600px]">
			<Table>
				<TableHeader>
					<TableRow>
						{TABLE_HEADERS.map((header) => (
							<TableHead key={header}>{header}</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{employeeList.map((employeeGroup) => {
						const { employee, dateGroups } = employeeGroup;
						const dates = Array.from(dateGroups.keys()).sort(
							(a, b) => new Date(b).getTime() - new Date(a).getTime()
						);

						return (
							<React.Fragment key={`${employee.id}-${dates.join('-')}`}>
								<TableRow className="bg-gray-50/50 dark:bg-gray-800/50">
									<TableCell colSpan={5}>
										<div className="flex gap-2 items-center px-1 py-2">
											<EmployeeAvatar employee={employee} />
											<span className="font-semibold text-gray-900 dark:text-gray-100">
												{employee.fullName}
											</span>
											<span className="ml-auto text-sm text-gray-600 dark:text-gray-400">
												Total time:{' '}
												{formatDuration(
													Array.from(dateGroups.values()).reduce(
														(sum, group) => sum + group.totalDuration,
														0
													)
												)}
											</span>
										</div>
									</TableCell>
								</TableRow>
								{dates.map((date) => {
									const dateGroup = dateGroups.get(date)!;
									return dateGroup.activities.map((activity, index) => (
										<MemoizedActivityRow
											key={`${date}-${activity.employeeId}-${index}`}
											activity={activity}
											date={date}
											isFirstOfDay={index === 0}
										/>
									));
								})}
							</React.Fragment>
						);
					})}
				</TableBody>
			</Table>
			<div className="p-2 mt-4">
				<Paginate
					total={total}
					onPageChange={onPageChange}
					pageCount={1}
					itemsPerPage={itemsPerPage}
					itemOffset={itemOffset}
					endOffset={endOffset}
					setItemsPerPage={setItemsPerPage}
					className="pt-0"
				/>
			</div>
		</Card>
	);
};

ProductivityEmployeeTable.displayName = 'ProductivityEmployeeTable';
