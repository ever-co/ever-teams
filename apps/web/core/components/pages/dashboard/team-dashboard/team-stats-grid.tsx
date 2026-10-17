'use client';

import { secondsToTime } from '@/core/lib/helpers/index';
import { Card } from '@/core/components/common/card';
import { cn } from '@/core/lib/helpers';
import { useAtomValue } from 'jotai';
import { chatPanelOpenAtom } from '@/core/components/features/chat-panel/atoms/chat-panel-open.atom';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { ITimesheetCountsStatistics } from '@/core/types/interfaces/timesheet/timesheet';
import { StatsCardSkeleton } from '@/core/components/common/skeleton/stats-card-skeleton';

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
	/** The small dot in front of the label: the stat's colour lives here, not in the number. */
	color?: string;
	progress?: number;
	progressColor?: string;
	showProgress: boolean;
}

export function TeamStatsGrid({
	statisticsCounts,
	loadingTimesheetStatisticsCounts
}: {
	statisticsCounts: ITimesheetCountsStatistics | null;
	loadingTimesheetStatisticsCounts: boolean;
}) {
	const { hours, minutes, seconds } = secondsToTime(statisticsCounts?.weekDuration || 0);
	const timeValue = formatTime(hours, minutes, seconds);
	const progress = formatPercentage(statisticsCounts?.weekActivities);
	const t = useTranslations();
	// The AI chat panel takes part of the width: step the columns up later while it is open.
	const chatOpen = useAtomValue(chatPanelOpenAtom);

	const stats: StatItem[] = useMemo(
		() => [
			{
				title: t('common.teamStats.MEMBERS_WORKED'),
				value: statisticsCounts?.employeesCount?.toString() || '0',
				type: 'number',
				color: 'bg-violet-500',
				showProgress: false
			},
			{
				title: t('common.teamStats.TRACKED'),
				value: timeValue,
				type: 'time',
				color: 'bg-blue-500',
				progress,
				progressColor: 'bg-blue-500',
				showProgress: true
			},
			{
				title: t('common.teamStats.MANUAL'),
				value: timeValue,
				type: 'time',
				color: 'bg-rose-500',
				progress,
				progressColor: 'bg-rose-500',
				showProgress: true
			},
			{
				title: t('common.teamStats.IDLE'),
				value: timeValue,
				type: 'time',
				color: 'bg-amber-500',
				progress,
				progressColor: 'bg-amber-500',
				showProgress: true
			},
			{
				title: t('common.teamStats.TOTAL_HOURS'),
				value: timeValue,
				type: 'time',
				color: 'bg-emerald-500',
				showProgress: false
			}
		],
		[timeValue, progress, statisticsCounts?.employeesCount, t]
	);

	return loadingTimesheetStatisticsCounts ? (
		<StatsCardSkeleton />
	) : (
		<div
			className={cn(
				'grid grid-cols-1 gap-3',
				chatOpen ? 'md:grid-cols-2 xl:grid-cols-3 4xl:grid-cols-5' : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
			)}
		>
			{stats.map((stat) => (
				<Card key={stat.title} className="flex flex-col gap-2 rounded-xl px-4 py-3.5 shadow-none">
					<div className="flex min-w-0 items-center gap-1.5">
						<span className={cn('size-1.5 shrink-0 rounded-full', stat.color)} aria-hidden="true" />
						<span className="truncate text-xs text-muted-foreground">{stat.title}</span>
					</div>
					<div className="flex h-6 items-center">
						{loadingTimesheetStatisticsCounts ? (
							<Loader2 className="size-5 animate-spin text-muted-foreground" />
						) : (
							<span className="text-xl font-semibold leading-none tracking-tight tabular-nums text-foreground">
								{stat.value}
							</span>
						)}
					</div>
					{stat.showProgress && (
						<div className="h-1 w-full rounded-full bg-muted">
							<div
								className={cn('h-full rounded-full transition-all duration-300', stat.progressColor)}
								style={{
									width: `${loadingTimesheetStatisticsCounts ? 0 : stat.progress}%`
								}}
							/>
						</div>
					)}
				</Card>
			))}
		</div>
	);
}
