'use client';

import { secondsToTime } from '@/core/lib/helpers/index';
import { Card } from '@/core/components/common/card';
import { cn } from '@/core/lib/helpers';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { ITimesheetCountsStatistics } from '@/core/types/interfaces/timesheet/timesheet';
import { STAT_CELL_CLASS_NAME, StatsCardSkeleton } from '@/core/components/common/skeleton/stats-card-skeleton';

// Shown when the API returned no value: never a zero it did not send.
const EMPTY_VALUE = '–';

function formatPercentage(value: number | undefined): number {
	if (!value) return 0;
	return Math.round(value);
}

function formatTime(hours: number, minutes: number, seconds: number): string {
	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function countValue(count: number | null | undefined): string {
	const isMissing = count === null || count === undefined;
	if (isMissing) {
		return EMPTY_VALUE;
	}
	return count.toString();
}

function durationValue(totalSeconds: number | null | undefined): string {
	const isMissing = totalSeconds === null || totalSeconds === undefined;
	if (isMissing) {
		return EMPTY_VALUE;
	}
	const { hours, minutes, seconds } = secondsToTime(totalSeconds);
	return formatTime(hours, minutes, seconds);
}

function hasValue(value: number | null | undefined) {
	return value !== null && value !== undefined;
}

interface StatItem {
	title: string;
	value: string;
	type: 'number' | 'time';
	progress?: number;
	showProgress: boolean;
}

/**
 * Only the figures the timesheet statistics endpoint returns: members and projects counts, today's and this week's
 * duration with their activity level. It returns no tracked, manual or idle split, so none is displayed.
 */
export function TeamStatsGrid({
	statisticsCounts,
	loadingTimesheetStatisticsCounts
}: {
	statisticsCounts: ITimesheetCountsStatistics | null;
	loadingTimesheetStatisticsCounts: boolean;
}) {
	const t = useTranslations();

	const stats: StatItem[] = useMemo(
		() => [
			{
				title: t('common.teamStats.MEMBERS_WORKED'),
				value: countValue(statisticsCounts?.employeesCount),
				type: 'number',
				showProgress: false
			},
			{
				title: t('sidebar.PROJECTS'),
				value: countValue(statisticsCounts?.projectsCount),
				type: 'number',
				showProgress: false
			},
			{
				title: t('common.TODAY'),
				value: durationValue(statisticsCounts?.todayDuration),
				type: 'time',
				progress: formatPercentage(statisticsCounts?.todayActivities),
				showProgress: hasValue(statisticsCounts?.todayActivities)
			},
			{
				title: t('common.THIS_WEEK'),
				value: durationValue(statisticsCounts?.weekDuration),
				type: 'time',
				progress: formatPercentage(statisticsCounts?.weekActivities),
				showProgress: hasValue(statisticsCounts?.weekActivities)
			}
		],
		[statisticsCounts, t]
	);

	if (loadingTimesheetStatisticsCounts) {
		return <StatsCardSkeleton />;
	}

	return (
		<Card className={cn('grid grid-cols-1 overflow-hidden', 'sm:grid-cols-2 xl:grid-cols-4')}>
			{stats.map((stat) => (
				<div key={stat.title} className={STAT_CELL_CLASS_NAME}>
					<span className="truncate text-xs text-muted-foreground">{stat.title}</span>
					<span className="text-2xl font-semibold leading-none tabular-nums text-foreground">
						{stat.value}
					</span>
					{stat.showProgress && (
						<div className="h-1 w-full rounded-full bg-foreground/10">
							<div className="h-full rounded-full bg-primary" style={{ width: `${stat.progress}%` }} />
						</div>
					)}
				</div>
			))}
		</Card>
	);
}
