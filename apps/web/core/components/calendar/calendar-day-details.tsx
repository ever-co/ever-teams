'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { Plus } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort, formatHoursLabel } from '@/core/lib/utils/dashboard-figures';
import { type CalendarDay, type CalendarDayPlan, dayAtCurrentTime } from '@/core/lib/utils/calendar-view';
import type { TimesheetFormatters } from '@/core/lib/utils/dashboards/timesheets';
import { type EntryHandlers, EntryListRow } from './calendar-entry-parts';
import { useReachText } from './calendar-month-view';
import { PLANNED_OUTLINE } from './calendar-recipes';

const BLOCK_TITLE = 'text-xs font-medium text-muted-foreground';

/** "6h 40m tracked · 82% of 8h", the line under a day's name. */
export function DaySummary({ day, className }: Readonly<{ day: CalendarDay; className?: string }>) {
	const t = useTranslations();
	const reach = useReachText(day);
	const tracked = formatDurationShort(day.trackedSeconds);
	const trackedText = t('dashboard.calendar.TRACKED_TOTAL', { total: tracked });
	return (
		<p className={cn('text-xs tabular-nums text-muted-foreground', className)}>
			{trackedText}
			{reach && ` · ${reach}`}
		</p>
	);
}

/** Done against planned for the day: "6h 10m / 8h", the done figure in ink, the planned one muted. */
export function DoneOfPlanned({ day, plan }: Readonly<{ day: CalendarDay; plan: CalendarDayPlan }>) {
	const t = useTranslations();
	const expectedSeconds = plan.expectedSeconds;
	if (!expectedSeconds) {
		return <span className="text-xs text-muted-foreground">{t('dashboard.calendar.PLAN_WITHOUT_TIME')}</span>;
	}
	const done = formatDurationShort(day.trackedSeconds);
	const expected = formatHoursLabel(expectedSeconds);
	return (
		<span className="flex flex-wrap items-baseline gap-x-1.5 text-[13px] tabular-nums">
			<span className="font-medium text-foreground">{done}</span>
			<span className="text-muted-foreground">/ {expected}</span>
			{plan.isFromEstimates && (
				<span className="text-xs text-muted-foreground">{t('dashboard.calendar.FROM_ESTIMATES')}</span>
			)}
		</span>
	);
}

function titleOrFallback(title: string, fallback: string) {
	if (title) {
		return title;
	}
	return fallback;
}

function estimateTextOf(estimateSeconds: number | null) {
	if (!estimateSeconds) {
		return '–';
	}
	return formatDurationShort(estimateSeconds);
}

/**
 * The day's plan: done against planned, then the planned tasks with their estimates, outlined. A page that puts the
 * block in a titled section of its own, with done against planned in that header, leaves out the block's header.
 */
export function DayPlanBlock({ day, showsHeader = true }: Readonly<{ day: CalendarDay; showsHeader?: boolean }>) {
	const t = useTranslations();
	const plan = day.plan;
	const untitled = t('dashboard.timesheets.NO_TASK');
	const planTasks = plan?.tasks ?? [];
	const hasPlanTasks = planTasks.length > 0;
	return (
		<section className="flex flex-col gap-2" aria-label={t('dashboard.calendar.PLAN_TITLE')}>
			{showsHeader && (
				<div className="flex items-baseline justify-between gap-3">
					<h3 className={BLOCK_TITLE}>{t('dashboard.calendar.PLAN_TITLE')}</h3>
					{plan && <DoneOfPlanned day={day} plan={plan} />}
				</div>
			)}
			{!plan && <p className="text-xs text-muted-foreground">{t('dashboard.calendar.NO_PLAN')}</p>}
			{hasPlanTasks && (
				<ul className="flex flex-col gap-1.5">
					{planTasks.map((task) => (
						<li
							key={task.id}
							className={cn(
								'flex min-w-0 items-center justify-between gap-3 rounded-md px-2.5 py-1.5',
								PLANNED_OUTLINE
							)}
						>
							<span className="truncate text-[13px] text-foreground">
								{titleOrFallback(task.title, untitled)}
							</span>
							<span className="shrink-0 text-xs tabular-nums text-muted-foreground">
								{estimateTextOf(task.estimateSeconds)}
							</span>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}

export function DayEntriesBlock({
	day,
	formatters,
	handlers
}: Readonly<{ day: CalendarDay; formatters: TimesheetFormatters; handlers: EntryHandlers }>) {
	const t = useTranslations();
	const count = day.entries.length;
	const hasEntries = count > 0;
	return (
		<section className="flex flex-col" aria-label={t('dashboard.calendar.ENTRIES_TITLE')}>
			<div className="flex items-baseline justify-between gap-3">
				<h3 className={BLOCK_TITLE}>{t('dashboard.calendar.ENTRIES_TITLE')}</h3>
				{hasEntries && (
					<span className="text-xs tabular-nums text-muted-foreground">
						{t('dashboard.calendar.ENTRY_COUNT', { count })}
					</span>
				)}
			</div>
			{!hasEntries && <p className="pt-2 text-xs text-muted-foreground">{t('dashboard.calendar.DAY_EMPTY')}</p>}
			{hasEntries && (
				<ul className="hairline-divide-y divide-border">
					{day.entries.map((entry) => (
						<EntryListRow key={entry.id} entry={entry} formatters={formatters} handlers={handlers} />
					))}
				</ul>
			)}
		</section>
	);
}

/** A day in full: its entries, its plan, and Add time. The month view's panel and the phone's day list show it. */
export function DayDetails({
	day,
	formatters,
	handlers,
	onAddTime
}: Readonly<{
	day: CalendarDay;
	formatters: TimesheetFormatters;
	handlers: EntryHandlers;
	onAddTime: (start: Date) => void;
}>) {
	const t = useTranslations();
	const addTimeOnDay = () => {
		const start = dayAtCurrentTime(day.date);
		onAddTime(start);
	};
	return (
		<div className="flex flex-col gap-5">
			<DayEntriesBlock day={day} formatters={formatters} handlers={handlers} />
			<div className="hairline-t border-dashed border-border pt-4">
				<DayPlanBlock day={day} />
			</div>
			<div>
				<Button type="button" variant="outline" size="default" onClick={addTimeOnDay}>
					<Plus />
					<span>{t('dashboard.timesheets.ADD_TIME')}</span>
				</Button>
			</div>
		</div>
	);
}
