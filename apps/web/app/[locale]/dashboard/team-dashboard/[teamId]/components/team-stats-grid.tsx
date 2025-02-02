'use client';

import { secondsToTime } from '@/app/helpers';
import { ITimesheetStatisticsData } from '@/app/interfaces';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useMemo } from 'react';

function formatPercentage(value: number | undefined): number {
	if (!value) return 0;
	return Math.round(value);
}

function formatTime(hours: number, minutes: number, seconds: number): string {
	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

interface StatItem {
	title: string;
	value: string;
	type: 'number' | 'time';
	color?: string;
	progress?: number;
	progressColor?: string;
	showProgress: boolean;
}

export function TeamStatsGrid({
	statisticsCounts,
	loadingTimesheetStatisticsCounts
}: {
	statisticsCounts: ITimesheetStatisticsData | null;
	loadingTimesheetStatisticsCounts: boolean;
}) {
	const { h: hours, m: minutes, s: seconds } = secondsToTime(statisticsCounts?.weekDuration || 0);
	const timeValue = formatTime(hours, minutes, seconds);
	const progress = formatPercentage(statisticsCounts?.weekActivities);

	const stats: StatItem[] = useMemo(
		() => [
			{
				title: 'Members worked',
				value: statisticsCounts?.employeesCount?.toString() || '0',
				type: 'number',
				showProgress: false
			},
			{
				title: 'Tracked',
				value: timeValue,
				type: 'time',
				color: 'text-blue-500',
				progress,
				progressColor: 'bg-blue-500',
				showProgress: true
			},
			{
				title: 'Manual',
				value: timeValue,
				type: 'time',
				color: 'text-red-500',
				progress,
				progressColor: 'bg-red-500',
				showProgress: true
			},
			{
				title: 'Idle',
				value: timeValue,
				type: 'time',
				color: 'text-yellow-500',
				progress,
				progressColor: 'bg-yellow-500',
				showProgress: true
			},
			{
				title: 'Total Hours',
				value: timeValue,
				type: 'time',
				color: 'text-green-500',
				showProgress: false
			}
		],
		[timeValue, progress, statisticsCounts?.employeesCount]
	);

	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
			{stats.map((stat) => (
				<Card key={stat.title} className="p-6 dark:bg-dark--theme-light">
					<div className="flex flex-col">
						<span className="text-sm font-medium text-gray-500">{stat.title}</span>
						<div className="mt-2 h-9">
							{loadingTimesheetStatisticsCounts ? (
								<Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
							) : (
								<span className={`text-2xl font-semibold ${stat.color || 'text-gray-900 dark:text-white'}`}>
									{stat.value}
								</span>
							)}
						</div>
						{stat.showProgress && (
							<div className="mt-4">
								<div className="w-full h-2 bg-gray-100 rounded-full dark:bg-gray-700">
									<div
										className={`h-full rounded-full ${stat.progressColor} transition-all duration-300`}
										style={{
											width: `${loadingTimesheetStatisticsCounts ? 0 : stat.progress}%`
										}}
									/>
								</div>
							</div>
						)}
					</div>
				</Card>
			))}
		</div>
	);
}
