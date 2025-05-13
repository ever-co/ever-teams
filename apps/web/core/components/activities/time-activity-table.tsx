import { FC } from 'react';
import { Avatar } from '@/core/components/common/avatar';
import Image from 'next/image';
import { Column, TimeActivityTableAdapter } from './time-activity-table-adapter';
import { formatDuration, getWeekRange } from '@/core/lib/utils/formatDuration';
import { EmptyTimeActivity } from './empty-time-activity';
import ProgressBar from '../common/progress-bar2';

interface TimeEntry {
	member: {
		name: string;
		imageUrl: string;
	};
	project: {
		name: string;
		imageUrl: string;
	};
	trackedHours: string;
	earnings: string;
	activityLevel: number;
	status: 'active' | 'inactive';
}

interface RawEmployeeLog {
	employee: {
		user: {
			name: string;
			imageUrl: string;
		};
	};
	sum: number;
	activity: number;
}

interface RawProjectLog {
	project: {
		name: string;
		imageUrl: string;
	};
	employeeLogs: RawEmployeeLog[];
}

interface RawDailyLog {
	date: string;
	logs: RawProjectLog[];
	sum: number;
	activity: number;
}

interface TimeActivityTableProps {
	data: RawDailyLog[];
	loading?: boolean;
}

export const TimeActivityTable: FC<TimeActivityTableProps> = ({ data, loading = false }) => {
	if (!loading && (!data || data.length === 0)) {
		return <EmptyTimeActivity />;
	}

	const columns: Column<TimeEntry>[] = [
		{
			header: 'Member',
			accessorKey: 'member',
			cell: (value) => {
				if (!value) return <div>No Member Data</div>;
				return (
					<div className="flex items-center gap-3">
						<Avatar className="w-8 h-8 rounded-full">
							<Image
								src={value.imageUrl || '/assets/images/avatar.png'}
								alt={value.name || 'Member'}
								width={32}
								height={32}
								className="rounded-full"
							/>
						</Avatar>
						<span className="font-medium">{value.name || 'Unnamed Member'}</span>
					</div>
				);
			}
		},
		{
			header: 'Project',
			accessorKey: 'project',
			cell: (value) => {
				if (!value) return <div>No Project Data</div>;
				return (
					<div className="flex items-center gap-3">
						<Avatar className="flex items-center justify-center bg-gray-100 rounded-xl dark:bg-gray-800">
							{value.imageUrl && (
								<Image
									src={value.imageUrl}
									alt={value.name || 'No project'}
									width={40}
									height={40}
									className="object-cover w-full h-full rounded-full"
								/>
							)}
						</Avatar>
						<span className="font-medium">{value.name || 'No project'}</span>
					</div>
				);
			}
		},
		{
			header: 'Tracked Hours',
			accessorKey: 'trackedHours',
			cell: (value, row) => (
				<div className="flex items-center justify-end gap-2">
					<div
						className="w-2 h-2 rounded-full"
						style={{
							backgroundColor: row.status === 'active' ? '#27AE60' : '#F2994A'
						}}
					/>
					<span className="font-medium">{value}</span>
				</div>
			),
			className: 'text-right'
		},
		{
			header: 'Earnings',
			accessorKey: 'earnings',
			className: 'text-right font-medium'
		},
		{
			header: 'Activity Level',
			accessorKey: 'activityLevel',
			cell: (value) => (
				<div className="flex items-center gap-3">
					<ProgressBar progress={value} color="bg-[#0088CC]" isLoading={loading} size="sm" />
					<span className="font-medium min-w-[3rem] text-right">{value}%</span>
				</div>
			)
		}
	];

	const weeklyData = data.reduce(
		(acc, dayLog) => {
			const date = new Date(dayLog.date);
			const { start, end } = getWeekRange(date);
			const weekKey = start.toISOString();

			if (!acc[weekKey]) {
				acc[weekKey] = {
					start,
					end,
					logs: [],
					totalSum: 0,
					totalActivity: 0,
					daysCount: 0,
					totalEarnings: 0
				};
			}

			acc[weekKey].logs.push(...dayLog.logs);
			acc[weekKey].totalSum += dayLog.sum;
			acc[weekKey].totalActivity += dayLog.activity;
			acc[weekKey].daysCount++;
			acc[weekKey].totalEarnings += 2000;

			return acc;
		},
		{} as Record<
			string,
			{
				start: Date;
				end: Date;
				logs: RawProjectLog[];
				totalSum: number;
				totalActivity: number;
				daysCount: number;
				totalEarnings: number;
			}
		>
	);

	const formattedData = Object.values(weeklyData).map((week) => {
		const entries: TimeEntry[] = week.logs.flatMap((projectLog) =>
			projectLog.employeeLogs.map((employeeLog) => ({
				member: {
					name: employeeLog.employee?.user?.name || 'No Member',
					imageUrl: employeeLog.employee?.user?.imageUrl || '/assets/images/avatar.png'
				},
				project: {
					name: projectLog.project?.name || 'No Project',
					imageUrl: projectLog.project?.imageUrl || '/assets/images/default-project.png'
				},
				trackedHours: `${formatDuration(employeeLog.sum)}h`,
				earnings: '160.00 USD',
				activityLevel: employeeLog.activity || 0,
				status: Math.random() > 0.5 ? 'active' : 'inactive'
			}))
		);

		const startDate = week.start.toLocaleDateString('en-US', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});

		const endDate = week.end.toLocaleDateString('en-US', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});

		return {
			headers: [
				{ label: 'Hours', value: `${formatDuration(week.totalSum)}h` },
				{ label: 'Earnings', value: `${week.totalEarnings.toFixed(2)} USD` },
				{ label: 'Average Activity', value: `${Math.round(week.totalActivity / week.daysCount)}%` }
			],
			dateRange: `${startDate} - ${endDate}`,
			entries
		};
	});

	return <TimeActivityTableAdapter data={formattedData} columns={columns} loading={loading} />;
};
