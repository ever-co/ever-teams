'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { startOfWeek } from 'date-fns';
import { cn } from '@/core/lib/helpers';
import { activityBarPercentOf, projectActivityOf, type ProjectActivity } from '@/core/lib/utils/project-activity';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import type { TTaskStatus } from '@/core/types/schemas/task/task-status.schema';

const SQUARE = 'size-2 shrink-0 rounded-[2px]';
const CHART_HEIGHT_CLASS = 'h-16';
const WEEK_CHECK_INTERVAL_MS = 5 * 60 * 1000;

function sameWeek(first: Date, second: Date) {
	const firstStart = startOfWeek(first, { weekStartsOn: 1 });
	const secondStart = startOfWeek(second, { weekStartsOn: 1 });
	return firstStart.getTime() === secondStart.getTime();
}

/** The current time, replaced only when a new week begins, so a tab left open keeps the window moving. */
function useNowByWeek(): Date {
	const [now, setNow] = useState(() => new Date());
	useEffect(() => {
		const timer = setInterval(() => {
			setNow((previous) => {
				const current = new Date();
				return sameWeek(previous, current) ? previous : current;
			});
		}, WEEK_CHECK_INTERVAL_MS);
		return () => clearInterval(timer);
	}, []);
	return now;
}

function LegendItem({ label, squareClass }: Readonly<{ label: string; squareClass: string }>) {
	return (
		<span className="flex items-center gap-1.5 text-xs text-muted-foreground">
			<span className={cn(SQUARE, squareClass)} />
			{label}
		</span>
	);
}

function Bar({ percent, className }: Readonly<{ percent: number; className: string }>) {
	return (
		<span className="flex h-full flex-1 items-end">
			<span className={cn('w-full rounded-t-[2px]', className)} style={{ height: `${percent}%` }} />
		</span>
	);
}

function WeekBars({ activity }: Readonly<{ activity: ProjectActivity }>) {
	const t = useTranslations();
	const format = useFormatter();
	return (
		<ul className={cn('flex gap-1.5 border-b border-foreground/10', CHART_HEIGHT_CLASS)}>
			{activity.weeks.map((week) => {
				const date = format.dateTime(week.weekStart, { month: 'short', day: 'numeric' });
				const label = t('pages.projects.detail.WEEKLY_TREND_WEEK', {
					date,
					created: week.created,
					completed: week.completed
				});
				return (
					<li key={week.weekStart.getTime()} className="flex h-full min-w-0 flex-1 gap-px" title={label}>
						<span className="sr-only">{label}</span>
						<Bar percent={activityBarPercentOf(week.created, activity.peak)} className="bg-foreground/25" />
						<Bar percent={activityBarPercentOf(week.completed, activity.peak)} className="bg-primary" />
					</li>
				);
			})}
		</ul>
	);
}

/**
 * Tasks created and completed per week over the last weeks, from the creation and resolution dates of the project's
 * tasks. It stays out of the way (renders nothing) until the project has had any of either in that window, or has done
 * tasks with no resolution date, which it says it cannot place instead of leaving them out silently.
 */
export function ProjectActivityChart({
	tasks,
	statuses
}: Readonly<{ tasks: ReadonlyArray<TTask>; statuses: TTaskStatus[] }>) {
	const t = useTranslations();
	const now = useNowByWeek();
	const activity = useMemo(() => projectActivityOf(tasks, statuses, now), [now, statuses, tasks]);
	const hasActivity = activity.created > 0 || activity.completed > 0;
	const hasUndated = activity.undatedDone > 0;

	if (!hasActivity && !hasUndated) {
		return null;
	}

	return (
		<div className="flex flex-col gap-2.5">
			<div className="flex flex-col gap-0.5">
				<h3 className="text-[13px] font-semibold text-foreground">{t('pages.projects.detail.WEEKLY_TREND')}</h3>
				{hasActivity && (
					<p className="text-xs text-muted-foreground">
						{t('pages.projects.detail.WEEKLY_TREND_SUMMARY', {
							weeks: activity.weeks.length,
							created: activity.created,
							completed: activity.completed
						})}
					</p>
				)}
			</div>
			{hasActivity && (
				<div className="flex gap-3">
					<LegendItem label={t('pages.projects.detail.CREATED')} squareClass="bg-foreground/25" />
					<LegendItem label={t('pages.projects.detail.COMPLETED')} squareClass="bg-primary" />
				</div>
			)}
			{hasActivity && <WeekBars activity={activity} />}
			{hasUndated && (
				<p className="text-xs text-muted-foreground">
					{t('pages.projects.detail.WEEKLY_TREND_UNDATED', { count: activity.undatedDone })}
				</p>
			)}
		</div>
	);
}
