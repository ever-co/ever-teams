'use client';

import { useMemo } from 'react';
import { useLocale } from 'next-intl';
import { DASHBOARD_SURFACE } from '@/core/components/dashboards/kit/recipes';
import { ActivityBlockError, type ActivityReadFailure } from '@/core/components/activities/activity-blocks';
import {
	TASK_GROUP_LABEL,
	TASK_GROUP_STACK,
	TASK_LIST_STACK,
	TASK_ROW_SKELETON_BAR
} from '@/core/components/tasks/task-row-recipes';
import { groupAppsByHour } from '@/core/lib/helpers/array-data';
import { cn } from '@/core/lib/helpers';
import { TDailyActivity } from '@/core/types/schemas';
import { TrackingSourceEmptyState } from './tracking-source-empty-state';
import VisitedItem, { formatUsageDuration } from './visited-Item';
import { VisitedItemSkeleton } from './visited-item-skeleton';

export type ActivityShareType = 'APP' | 'SITE';

interface ActivityHour {
	hour: string;
	label: string;
	totalSeconds: number;
	apps: TDailyActivity[];
}

const SKELETON_ROWS = [0, 1, 2];

const ROWS_SURFACE = cn(DASHBOARD_SURFACE, 'px-4 py-1');

function secondsOfActivity(app: TDailyActivity) {
	const duration = app.duration ?? 0;
	return Number(duration);
}

function byLongestFirst(first: TDailyActivity, second: TDailyActivity) {
	return secondsOfActivity(second) - secondsOfActivity(first);
}

function byLatestHourFirst(first: ActivityHour, second: ActivityHour) {
	return second.hour.localeCompare(first.hour);
}

/** `09:00` as `9:00 AM – 10:00 AM` in the reader's form; an hour that does not parse keeps its recorded text. */
function hourLabelOf(hour: string, format: Intl.DateTimeFormat) {
	const hourDigits = hour.slice(0, 2);
	const startHour = Number.parseInt(hourDigits, 10);
	if (Number.isNaN(startHour)) {
		return hour;
	}
	const start = new Date();
	start.setHours(startHour, 0, 0, 0);
	const endHour = startHour + 1;
	const end = new Date(start);
	end.setHours(endHour);
	return format.formatRange(start, end);
}

/** The day's entries by hour (rows without a duration dropped, as before), the latest hour first, rows ranked. */
function activityHoursOf(activities: TDailyActivity[], format: Intl.DateTimeFormat): ActivityHour[] {
	const groups = groupAppsByHour(activities);
	const hours = groups.map((group) => {
		const apps = [...group.apps];
		apps.sort(byLongestFirst);
		const label = hourLabelOf(group.hour, format);
		return { hour: group.hour, label, totalSeconds: group.totalMilliseconds, apps };
	});
	return hours.sort(byLatestHourFirst);
}

export function ActivityShareGroupsSkeleton() {
	return (
		<div className={TASK_GROUP_STACK} aria-hidden="true">
			<div className="flex min-h-8 items-center">
				<span className={cn('h-2.5 w-28', TASK_ROW_SKELETON_BAR)} />
			</div>
			<div className={ROWS_SURFACE}>
				{SKELETON_ROWS.map((row) => (
					<VisitedItemSkeleton key={row} />
				))}
			</div>
		</div>
	);
}

/**
 * Today's apps or visited sites, hour by hour: each hour's label outside its surface with the hour's total, then
 * ranked share rows. Loading, failure and empty keep the same place.
 */
export function ActivityShareGroups({
	activities,
	type,
	loading,
	failure,
	emptyLabel,
	errorTitle
}: Readonly<{
	activities: TDailyActivity[];
	type: ActivityShareType;
	loading: boolean;
	failure?: ActivityReadFailure;
	emptyLabel: string;
	errorTitle: string;
}>) {
	const locale = useLocale();
	const hourFormat = useMemo(() => new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }), [locale]);
	const hours = useMemo(() => activityHoursOf(activities, hourFormat), [activities, hourFormat]);
	const hasNoActivity = activities.length < 1;
	const isFirstLoad = loading && hasNoActivity;

	if (isFirstLoad) {
		return <ActivityShareGroupsSkeleton />;
	}
	if (failure && hasNoActivity) {
		return <ActivityBlockError title={errorTitle} onRetry={failure.onRetry} />;
	}
	if (hours.length === 0) {
		return (
			<div className="flex items-center justify-center px-4 py-12">
				<TrackingSourceEmptyState label={emptyLabel} />
			</div>
		);
	}
	return (
		<div className={TASK_LIST_STACK}>
			{hours.map((hour) => (
				<section key={hour.hour} className={TASK_GROUP_STACK} aria-label={hour.label}>
					<h3 className={cn(TASK_GROUP_LABEL, 'justify-between tabular-nums')}>
						<span>{hour.label}</span>
						<span className="font-normal">{formatUsageDuration(hour.totalSeconds)}</span>
					</h3>
					<div className={ROWS_SURFACE}>
						{hour.apps.map((app, index) => (
							<VisitedItem
								key={`${app.title}-${index}`}
								app={app}
								totalMilliseconds={hour.totalSeconds}
								type={type}
							/>
						))}
					</div>
				</section>
			))}
		</div>
	);
}
