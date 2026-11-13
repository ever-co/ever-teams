'use client';

import { memo, type ReactNode, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { SECTION_HEADER, SECTION_META, SECTION_TITLE, SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import { formatPeriod, type Period } from '@/core/lib/utils/dashboard-period';
import {
	type CalendarDay,
	type CalendarMonth,
	type CalendarWeek,
	chunksOf,
	logDurationSeconds,
	monthsOfPeriod,
	statusOfLog,
	type TimesheetDay,
	type TimesheetFormatters,
	timeRangeTextOf,
	totalOfDays,
	weeksOfPeriod
} from '@/core/lib/utils/dashboards/timesheets';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { useWorkspaceLocale } from '@/core/hooks/common/use-workspace-locale';
import { dayLabelOf } from './timesheet-day-label';
import { STATUS_LABEL_KEYS, TimesheetStatusGlyph } from './timesheet-status';

/** Cards shown in a week column before the rest is summed up in one "N more logs" line. */
const VISIBLE_CARDS = 6;

const DAYS_IN_A_WEEK = 7;

const CALENDAR_ACTION =
	'outline-none transition-colors hover:bg-foreground/[0.03] focus-visible:bg-foreground/[0.03] focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/25';

export type DayLookup = ReadonlyMap<string, TimesheetDay>;

interface CalendarProps {
	period: Period;
	dayByKey: DayLookup;
	formatters: TimesheetFormatters;
	onOpenDay: (dayKey: string) => void;
	/** One sentence above the grid when the period or the filters leave nothing to show; the grid keeps its frame. */
	notice?: ReactNode;
}

const WeekLogCard = memo(function WeekLogCard({
	log,
	dayKey,
	formatters,
	onOpenDay
}: Readonly<{ log: ITimeLog; dayKey: string; formatters: TimesheetFormatters; onOpenDay: (dayKey: string) => void }>) {
	const t = useTranslations();
	const status = statusOfLog(log);
	const title = log.task?.title ?? t('dashboard.timesheets.NO_TASK');
	const runningLabel = t('dashboard.timesheets.RUNNING');
	const timeText = timeRangeTextOf(log, formatters, runningLabel);
	const durationSeconds = logDurationSeconds(log);
	const duration = formatDurationShort(durationSeconds);
	return (
		<button
			type="button"
			onClick={() => onOpenDay(dayKey)}
			className={cn(
				'flex w-full min-w-0 flex-col gap-0.5 rounded-md bg-foreground/[0.035] px-2 py-1.5 text-left dark:bg-foreground/[0.05]',
				CALENDAR_ACTION
			)}
		>
			<span className="flex min-w-0 items-center justify-between gap-2">
				<span className="truncate text-[11px] tabular-nums text-muted-foreground">{timeText}</span>
				{status && (
					<>
						<TimesheetStatusGlyph status={status} className="size-3.5" />
						<span className="sr-only">{t(STATUS_LABEL_KEYS[status])}</span>
					</>
				)}
			</span>
			<span className="line-clamp-2 text-xs font-medium text-foreground">{title}</span>
			<span className="text-[11px] font-medium tabular-nums text-foreground">{duration}</span>
		</button>
	);
});

function WeekDayHeader({
	day,
	workDay,
	formatters
}: Readonly<{ day: CalendarDay; workDay: TimesheetDay | undefined; formatters: TimesheetFormatters }>) {
	const isMuted = !day.isInPeriod;
	return (
		<div className="flex min-h-10 items-center justify-between gap-2 hairline-b border-border px-2.5">
			<span
				className={cn(
					'flex items-baseline gap-1.5 text-xs text-muted-foreground',
					isMuted && 'text-muted-foreground/60'
				)}
			>
				<span>{formatters.weekdayShort(day.date)}</span>
				<span
					className={cn(
						'text-[13px] font-medium tabular-nums text-foreground',
						isMuted && 'text-muted-foreground/60',
						day.isToday && 'font-semibold text-primary-ink'
					)}
				>
					{formatters.dayNumber(day.date)}
				</span>
			</span>
			{workDay && (
				<span className="text-xs font-medium tabular-nums text-foreground">
					{formatDurationShort(workDay.totalSeconds)}
				</span>
			)}
		</div>
	);
}

function WeekDayColumn({
	day,
	workDay,
	formatters,
	onOpenDay
}: Readonly<{
	day: CalendarDay;
	workDay: TimesheetDay | undefined;
	formatters: TimesheetFormatters;
	onOpenDay: (dayKey: string) => void;
}>) {
	const t = useTranslations();
	const logs = workDay?.logs ?? [];
	const shownLogs = logs.slice(0, VISIBLE_CARDS);
	const hiddenCount = logs.length - shownLogs.length;
	const hasHiddenLogs = hiddenCount > 0;
	const hasLogs = logs.length > 0;
	const isOutsidePeriod = !day.isInPeriod;
	const hidesOnPhone = isOutsidePeriod && !hasLogs;
	const label = dayLabelOf(day.date, t, formatters);

	return (
		<div
			role="group"
			aria-label={label}
			className={cn(
				'flex min-w-0 flex-col',
				isOutsidePeriod && 'bg-foreground/[0.03]',
				hidesOnPhone && 'max-md:hidden'
			)}
		>
			<WeekDayHeader day={day} workDay={workDay} formatters={formatters} />
			<div className="flex min-h-14 flex-col gap-1.5 p-1.5 md:min-h-44">
				{shownLogs.map((log) => (
					<WeekLogCard
						key={log.id}
						log={log}
						dayKey={day.key}
						formatters={formatters}
						onOpenDay={onOpenDay}
					/>
				))}
				{hasHiddenLogs && (
					<button
						type="button"
						onClick={() => onOpenDay(day.key)}
						className={cn('rounded-md px-2 py-1 text-left text-xs text-muted-foreground', CALENDAR_ACTION)}
					>
						{t('dashboard.timesheets.MORE_LOGS', { count: hiddenCount })}
					</button>
				)}
			</div>
		</div>
	);
}

function WeekBlock({
	week,
	showsTitle,
	dayByKey,
	formatters,
	onOpenDay
}: Readonly<{
	week: CalendarWeek;
	showsTitle: boolean;
	dayByKey: DayLookup;
	formatters: TimesheetFormatters;
	onOpenDay: (dayKey: string) => void;
}>) {
	const locale = useWorkspaceLocale();
	const title = formatPeriod({ from: week.from, to: week.to }, locale);
	const total = totalOfDays(week.days, dayByKey);
	return (
		<section aria-label={title}>
			{showsTitle && (
				<header className={SECTION_HEADER}>
					<h3 className={SECTION_TITLE}>{title}</h3>
					<span className={SECTION_META}>{formatDurationShort(total)}</span>
				</header>
			)}
			<div className="grid grid-cols-1 max-md:hairline-divide-y md:grid-cols-7 md:hairline-divide-x divide-border">
				{week.days.map((day) => (
					<WeekDayColumn
						key={day.key}
						day={day}
						workDay={dayByKey.get(day.key)}
						formatters={formatters}
						onOpenDay={onOpenDay}
					/>
				))}
			</div>
		</section>
	);
}

/**
 * The week view: seven columns per week of the period, each headed by its day and total, the logs stacked in the
 * order they started. A card or "N more logs" opens that day in the list.
 */
export function TimesheetsWeekView({ period, dayByKey, formatters, onOpenDay, notice }: Readonly<CalendarProps>) {
	const weeks = useMemo(() => weeksOfPeriod(period), [period]);
	const showsTitles = weeks.length > 1;
	return (
		<div className="flex flex-col gap-4">
			{notice}
			{weeks.map((week) => (
				<WeekBlock
					key={week.key}
					week={week}
					showsTitle={showsTitles}
					dayByKey={dayByKey}
					formatters={formatters}
					onOpenDay={onOpenDay}
				/>
			))}
		</div>
	);
}

function MonthDayCell({
	day,
	workDay,
	formatters,
	onOpenDay
}: Readonly<{
	day: CalendarDay;
	workDay: TimesheetDay | undefined;
	formatters: TimesheetFormatters;
	onOpenDay: (dayKey: string) => void;
}>) {
	const t = useTranslations();
	const isShownDay = day.isInMonth && day.isInPeriod;
	const opensDay = isShownDay && Boolean(workDay);
	const isFaded = !isShownDay;
	const statuses = workDay?.statuses ?? [];
	const showsTotal = isShownDay && Boolean(workDay);
	const showsStatuses = isShownDay && statuses.length > 0;
	const totalText = formatDurationShort(workDay?.totalSeconds ?? 0);
	const dayLabel = dayLabelOf(day.date, t, formatters);
	const openLabel = t('dashboard.timesheets.OPEN_DAY', { day: dayLabel });

	const content = (
		<>
			<span className="flex items-start justify-between gap-1">
				<span
					className={cn(
						'inline-flex size-6 items-center justify-center rounded-full text-xs tabular-nums text-foreground',
						isFaded && 'text-muted-foreground/50',
						day.isToday && 'bg-primary font-semibold text-primary-foreground'
					)}
				>
					{formatters.dayNumber(day.date)}
				</span>
				{showsTotal && (
					<span className="pt-1 text-xs font-medium tabular-nums text-foreground max-sm:hidden">
						{totalText}
					</span>
				)}
			</span>
			{showsStatuses && (
				<span className="mt-auto flex flex-wrap items-center gap-1">
					{statuses.map((status) => (
						<span key={status} className="inline-flex">
							<TimesheetStatusGlyph status={status} className="size-3.5" />
							<span className="sr-only">{t(STATUS_LABEL_KEYS[status])}</span>
						</span>
					))}
				</span>
			)}
		</>
	);

	const cellClassName = 'flex min-h-16 min-w-0 flex-col gap-1 p-1.5 text-left md:min-h-24 md:p-2';

	if (opensDay) {
		return (
			<button type="button" onClick={() => onOpenDay(day.key)} className={cn(cellClassName, CALENDAR_ACTION)}>
				<span className="sr-only">{openLabel}</span>
				{content}
			</button>
		);
	}
	return <div className={cn(cellClassName, isFaded && 'bg-foreground/[0.03]')}>{content}</div>;
}

function MonthBlock({
	month,
	dayByKey,
	formatters,
	onOpenDay
}: Readonly<{
	month: CalendarMonth;
	dayByKey: DayLookup;
	formatters: TimesheetFormatters;
	onOpenDay: (dayKey: string) => void;
}>) {
	const shownDays = month.days.filter((day) => day.isInMonth);
	const total = totalOfDays(shownDays, dayByKey);
	const weekRows = chunksOf(month.days, DAYS_IN_A_WEEK);
	const firstWeek = weekRows[0] ?? [];
	const title = formatters.monthTitle(month.month);
	return (
		<section aria-label={title}>
			<header className={SECTION_HEADER}>
				<h3 className={SECTION_TITLE}>{title}</h3>
				<span className={SECTION_META}>{formatDurationShort(total)}</span>
			</header>
			<div className="grid grid-cols-7 hairline-b border-border" aria-hidden="true">
				{firstWeek.map((day) => (
					<span key={day.key} className="truncate px-2 py-1.5 text-xs text-muted-foreground">
						{formatters.weekdayShort(day.date)}
					</span>
				))}
			</div>
			<div className="hairline-divide-y divide-border">
				{weekRows.map((row) => (
					<div key={row[0]?.key} className="grid grid-cols-7 hairline-divide-x divide-border">
						{row.map((day) => (
							<MonthDayCell
								key={day.key}
								day={day}
								workDay={dayByKey.get(day.key)}
								formatters={formatters}
								onOpenDay={onOpenDay}
							/>
						))}
					</div>
				))}
			</div>
		</section>
	);
}

/**
 * The month view: a calendar per month of the period, each day with its total and one glyph per status present;
 * a day with logs opens in the list.
 */
export function TimesheetsMonthView({ period, dayByKey, formatters, onOpenDay, notice }: Readonly<CalendarProps>) {
	const months = useMemo(() => monthsOfPeriod(period), [period]);
	return (
		<div className="flex flex-col gap-4">
			{notice}
			{months.map((month) => (
				<MonthBlock
					key={month.key}
					month={month}
					dayByKey={dayByKey}
					formatters={formatters}
					onOpenDay={onOpenDay}
				/>
			))}
		</div>
	);
}

const SKELETON_COLUMN_CARDS = [2, 1, 3, 2, 1, 0, 0];

const WEEKDAY_CELLS = Array.from({ length: DAYS_IN_A_WEEK }, (_, index) => index);

/** The week or month frame while the first logs load: the real grid, pale blocks where cards and totals go. */
export function TimesheetsCalendarSkeleton({ view }: Readonly<{ view: 'week' | 'month' }>) {
	if (view === 'month') {
		const cells = Array.from({ length: DAYS_IN_A_WEEK * 5 }, (_, index) => index);
		const rows = chunksOf(cells, DAYS_IN_A_WEEK);
		return (
			<div aria-hidden="true">
				<div className={SECTION_HEADER}>
					<span className={cn('h-2.5 w-28', SKELETON_BAR)} />
				</div>
				<div className="grid grid-cols-7 hairline-b border-border">
					{WEEKDAY_CELLS.map((cell) => (
						<span key={cell} className="flex h-7 items-center px-2">
							<span className={cn('h-2 w-6', SKELETON_BAR)} />
						</span>
					))}
				</div>
				<div className="hairline-divide-y divide-border">
					{rows.map((row) => (
						<div key={row[0]} className="grid grid-cols-7 hairline-divide-x divide-border">
							{row.map((cell) => (
								<div key={cell} className="flex min-h-16 flex-col gap-2 p-2 md:min-h-24">
									<span className={cn('h-2.5 w-4', SKELETON_BAR)} />
								</div>
							))}
						</div>
					))}
				</div>
			</div>
		);
	}
	return (
		<div
			aria-hidden="true"
			className="grid grid-cols-1 max-md:hairline-divide-y md:grid-cols-7 md:hairline-divide-x divide-border"
		>
			{SKELETON_COLUMN_CARDS.map((cardCount, columnIndex) => (
				<div key={columnIndex} className="flex flex-col">
					<div className="flex min-h-10 items-center hairline-b border-border px-2.5">
						<span className={cn('h-2.5 w-10', SKELETON_BAR)} />
					</div>
					<div className="flex min-h-14 flex-col gap-1.5 p-1.5 md:min-h-44">
						{Array.from({ length: cardCount }, (_, cardIndex) => (
							<span key={cardIndex} className="block h-14 rounded-md bg-foreground/[0.035]" />
						))}
					</div>
				</div>
			))}
		</div>
	);
}
