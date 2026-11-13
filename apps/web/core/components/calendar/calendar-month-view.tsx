'use client';

import { memo, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { isToday } from 'date-fns';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort, formatHoursLabel, formatPercent, percentOf } from '@/core/lib/utils/dashboard-figures';
import { type CalendarDay, type CalendarEntry, isInAnchorMonth, isWeekendDay } from '@/core/lib/utils/calendar-view';
import type { TimesheetFormatters } from '@/core/lib/utils/dashboards/timesheets';
import { CALENDAR_ACTION, ENTRY_HATCHED, WEEKEND_TINT } from './calendar-recipes';
import { ProjectDot, useEntryTitle } from './calendar-entry-parts';

/** Entry lines a cell shows before the rest is counted in "+N more". */
const VISIBLE_ENTRY_LINES = 2;

const DAYS_IN_A_WEEK = 7;

function weeksOf(days: ReadonlyArray<CalendarDay>) {
	const weeks: CalendarDay[][] = [];
	for (let index = 0; index < days.length; index += DAYS_IN_A_WEEK) {
		const week = days.slice(index, index + DAYS_IN_A_WEEK);
		weeks.push(week);
	}
	return weeks;
}

/** "82% of 8h" when the day has a plan with time; nothing otherwise. */
export function useReachText(day: CalendarDay) {
	const t = useTranslations();
	const locale = useLocale();
	const expectedSeconds = day.plan?.expectedSeconds;
	if (!expectedSeconds) {
		return null;
	}
	const share = percentOf(day.trackedSeconds, expectedSeconds);
	const percent = formatPercent(share, locale);
	const expected = formatHoursLabel(expectedSeconds);
	return t('dashboard.calendar.REACH', { percent, expected });
}

function EntryLine({ entry }: Readonly<{ entry: CalendarEntry }>) {
	const title = useEntryTitle(entry);
	const duration = formatDurationShort(entry.durationSeconds);
	return (
		<span className="flex min-w-0 items-center gap-1.5 text-[11px] leading-4">
			<ProjectDot color={entry.projectColor} projectKey={entry.projectKey} className="size-1.5" />
			<span className="min-w-0 flex-1 truncate text-foreground">{title}</span>
			<span className="shrink-0 tabular-nums text-muted-foreground">{duration}</span>
		</span>
	);
}

/** Tracked and manual time of the day as one thin bar, drawn only when the day has manual time. */
function SplitBar({ day }: Readonly<{ day: CalendarDay }>) {
	const manualShare = percentOf(day.manualSeconds, day.trackedSeconds);
	const trackedShare = 100 - manualShare;
	return (
		<span aria-hidden="true" className="flex h-1 w-full gap-px overflow-hidden rounded-full">
			<span className="h-full rounded-full bg-primary/70" style={{ width: `${trackedShare}%` }} />
			<span
				className={cn('h-full rounded-full [--entry:hsl(var(--primary))]', ENTRY_HATCHED)}
				style={{ width: `${manualShare}%` }}
			/>
		</span>
	);
}

function DayNumber({
	date,
	isOutside,
	formatters
}: Readonly<{ date: Date; isOutside: boolean; formatters: TimesheetFormatters }>) {
	const isDayToday = isToday(date);
	const dayNumber = formatters.dayNumber(date);
	if (isDayToday) {
		return (
			<span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold tabular-nums text-primary-foreground">
				{dayNumber}
			</span>
		);
	}
	return (
		<span
			className={cn(
				'flex h-6 min-w-6 items-center text-xs tabular-nums text-foreground',
				isOutside && 'text-muted-foreground/70'
			)}
		>
			{dayNumber}
		</span>
	);
}

function useCellLabel(day: CalendarDay, formatters: TimesheetFormatters) {
	const t = useTranslations();
	const weekday = formatters.weekday(day.date);
	const dayDate = formatters.dayDate(day.date);
	const dayLabel = t('dashboard.timesheets.DAY_LABEL', { day: weekday, date: dayDate });
	if (day.trackedSeconds === 0) {
		return t('dashboard.calendar.DAY_CELL_EMPTY', { day: dayLabel });
	}
	const total = formatDurationShort(day.trackedSeconds);
	return t('dashboard.calendar.DAY_CELL_LABEL', { day: dayLabel, total });
}

const MonthCell = memo(function MonthCell({
	day,
	anchor,
	formatters,
	isLoading,
	onOpenDay
}: Readonly<{
	day: CalendarDay;
	anchor: Date;
	formatters: TimesheetFormatters;
	isLoading: boolean;
	onOpenDay: (dayKey: string) => void;
}>) {
	const t = useTranslations();
	const label = useCellLabel(day, formatters);
	const reach = useReachText(day);
	const isOutside = !isInAnchorMonth(day.date, anchor);
	const isWeekend = isWeekendDay(day.date);
	const hasTime = day.trackedSeconds > 0;
	const hasManualTime = day.manualSeconds > 0;
	const total = formatDurationShort(day.trackedSeconds);
	const shownEntries = day.entries.slice(0, VISIBLE_ENTRY_LINES);
	const hiddenCount = day.entries.length - shownEntries.length;
	const showsTotal = hasTime && !isLoading;
	const showsSplit = hasManualTime && !isLoading;
	const showsReach = Boolean(reach) && !isLoading;
	const showsEntries = !isLoading;
	const showsMore = hiddenCount > 0 && !isLoading;

	return (
		<div role="gridcell" className={cn('min-w-0', isWeekend && WEEKEND_TINT)}>
			<button
				type="button"
				onClick={() => onOpenDay(day.key)}
				aria-label={label}
				className={cn(
					'flex h-full min-h-25 w-full min-w-0 flex-col gap-1 p-1.5 text-left hover:bg-foreground/[0.03]',
					CALENDAR_ACTION,
					isOutside && 'bg-foreground/[0.015]'
				)}
			>
				<span className="flex items-center justify-between gap-1">
					<DayNumber date={day.date} isOutside={isOutside} formatters={formatters} />
					{showsTotal && (
						<span className="truncate text-xs font-medium tabular-nums text-foreground">{total}</span>
					)}
					{isLoading && <span className={cn('h-2 w-9', SKELETON_BAR)} />}
				</span>
				{showsSplit && <SplitBar day={day} />}
				{showsReach && <span className="truncate text-[11px] tabular-nums text-muted-foreground">{reach}</span>}
				{showsEntries && (
					<span className="flex min-w-0 flex-col gap-0.5">
						{shownEntries.map((entry) => (
							<EntryLine key={entry.id} entry={entry} />
						))}
					</span>
				)}
				{showsMore && (
					<span className="text-[11px] tabular-nums text-muted-foreground">
						{t('dashboard.calendar.MORE_ENTRIES', { count: hiddenCount })}
					</span>
				)}
			</button>
		</div>
	);
});

/**
 * Six whole weeks around the month, Monday first unless the organisation starts its weeks on another day:
 * the day number with its total, the manual split, the plan reach and the first entries; a click opens the day.
 */
export function CalendarMonthView({
	days,
	anchor,
	formatters,
	isLoading,
	onOpenDay
}: Readonly<{
	days: ReadonlyArray<CalendarDay>;
	anchor: Date;
	formatters: TimesheetFormatters;
	isLoading: boolean;
	onOpenDay: (dayKey: string) => void;
}>) {
	const t = useTranslations();
	const weeks = useMemo(() => weeksOf(days), [days]);
	const firstWeek = weeks[0] ?? [];
	return (
		<div role="grid" aria-label={t('dashboard.calendar.GRID_LABEL')} className="flex flex-col">
			<div role="row" className="grid grid-cols-7 hairline-b hairline-divide-x divide-border border-border">
				{firstWeek.map((day) => {
					const isWeekend = isWeekendDay(day.date);
					const weekday = formatters.weekdayShort(day.date);
					return (
						<div
							key={day.key}
							role="columnheader"
							className={cn('px-1.5 py-2 text-xs text-muted-foreground', isWeekend && WEEKEND_TINT)}
						>
							{weekday}
						</div>
					);
				})}
			</div>
			<div className="hairline-divide-y divide-border">
				{weeks.map((week) => (
					<div key={week[0]?.key} role="row" className="grid grid-cols-7 hairline-divide-x divide-border">
						{week.map((day) => (
							<MonthCell
								key={day.key}
								day={day}
								anchor={anchor}
								formatters={formatters}
								isLoading={isLoading}
								onOpenDay={onOpenDay}
							/>
						))}
					</div>
				))}
			</div>
		</div>
	);
}
