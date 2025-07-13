import { FC } from 'react';
import { Avatar } from '@/core/components/common/avatar';
import Image from 'next/image';
import { formatDuration, getWeekRange } from '@/core/lib/utils/formatDuration';
import { EmptyTimeActivity } from '../../activities/empty-time-activity';
import { Column, TimeActivityTableAdapter } from './time-activity-table-adapter';
import ProgressBar from '../../duplicated-components/progress-bar';
import { useTranslations } from 'next-intl';

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
	const t = useTranslations();

	if (!loading && (!data || data.length === 0)) {
		return <EmptyTimeActivity />;
	}

	const columns: Column<TimeEntry>[] = [
		{
			header: t('common.MEMBER'),
			accessorKey: 'member',
			cell: (value) => {
				if (!value) return <div>{t('common.NO_MEMBER_DATA')}</div>;
				return (
					<div className="flex items-center gap-3">
						<Avatar className="w-8 h-8 rounded-full">
							<Image
								src={value.imageUrl || '/assets/images/avatar.png'}
								alt={value.name || t('common.MEMBER')}
								width={32}
								height={32}
								className="rounded-full"
							/>
						</Avatar>
						<span className="font-medium">{value.name || t('timeActivity.UNNAMED_EMPLOYEE')}</span>
					</div>
				);
			}
		},
		{
			header: t('sidebar.PROJECTS'),
			accessorKey: 'project',
			cell: (value) => {
				if (!value) return <div>{t('common.NO_PROJECT_DATA')}</div>;
				return (
					<div className="flex items-center gap-3">
						<Avatar className="flex items-center justify-center bg-gray-100 rounded-xl dark:bg-gray-800">
							{value.imageUrl && (
								<Image
									src={value.imageUrl}
									alt={value.name || t('common.NO_PROJECT')}
									width={40}
									height={40}
									className="object-cover w-full h-full rounded-full"
								/>
							)}
						</Avatar>
						<span className="font-medium">{value.name || t('common.NO_PROJECT')}</span>
					</div>
				);
			}
		},
		{
			header: t('timeActivity.TRACKED_HOURS'),
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
			header: t('timeActivity.EARNINGS'),
			accessorKey: 'earnings',
			className: 'text-right font-medium'
		},
		{
			header: t('timeActivity.ACTIVITY_LEVEL'),
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
					name: projectLog.project?.name || t('common.NO_PROJECT'),
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
				{ label: t('timeActivity.HOURS_LABEL'), value: `${formatDuration(week.totalSum)}h` },
				{ label: t('timeActivity.EARNINGS_LABEL'), value: `${week.totalEarnings.toFixed(2)} USD` },
				{
					label: t('timeActivity.AVERAGE_ACTIVITY_LABEL'),
					value: `${Math.round(week.totalActivity / week.daysCount)}%`
				}
			],
			dateRange: `${startDate} - ${endDate}`,
			entries
		};
	});

	return <TimeActivityTableAdapter data={formattedData} columns={columns} loading={loading} />;
};
