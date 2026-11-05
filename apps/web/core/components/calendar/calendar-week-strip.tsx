'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { addDays, isSameDay, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import type { WeekStart } from '@/core/lib/utils/dashboard-period';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { type CalendarDay, weekOfDay } from '@/core/lib/utils/calendar-view';
import type { TimesheetFormatters } from '@/core/lib/utils/dashboards/timesheets';
import type { EntryHandlers } from './calendar-entry-parts';
import { DayDetails, DaySummary } from './calendar-day-details';

const DAYS_IN_A_WEEK = 7;

const STEP_BUTTON =
	'inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 [&_svg]:size-4';

function trackedByDayOf(days: ReadonlyArray<CalendarDay>) {
	const byDay = new Map<string, number>();
	for (const day of days) {
		byDay.set(day.key, day.trackedSeconds);
	}
	return byDay;
}

function dayButtonClassOf(isSelected: boolean, isDayToday: boolean) {
	if (isSelected) {
		return 'bg-primary text-primary-foreground';
	}
	if (isDayToday) {
		return 'text-primary-ink';
	}
	return 'text-foreground';
}

/**
 * The month on a phone: the week of the picked day as a strip (a dot under days with time, the picked day filled)
 * over that day's entries and plan, in place of a grid too narrow to read.
 */
export function CalendarWeekStrip({
	days,
	selectedDay,
	weekStartsOn,
	formatters,
	handlers,
	isLoading,
	onSelectDay,
	onAddTime
}: Readonly<{
	days: ReadonlyArray<CalendarDay>;
	selectedDay: CalendarDay | null;
	weekStartsOn: WeekStart;
	formatters: TimesheetFormatters;
	handlers: EntryHandlers;
	isLoading: boolean;
	onSelectDay: (date: Date) => void;
	onAddTime: (start: Date) => void;
}>) {
	const t = useTranslations();
	const trackedByDay = useMemo(() => trackedByDayOf(days), [days]);
	const selectedDate = selectedDay?.date ?? null;
	const weekDates = useMemo(() => {
		if (!selectedDate) {
			return [];
		}
		return weekOfDay(selectedDate, weekStartsOn);
	}, [selectedDate, weekStartsOn]);

	if (!selectedDay) {
		return null;
	}
	const weekday = formatters.weekday(selectedDay.date);
	const dayDate = formatters.dayDate(selectedDay.date);
	const dayTitle = t('dashboard.timesheets.DAY_LABEL', { day: weekday, date: dayDate });
	const showPreviousWeek = () => {
		const previousWeekDay = addDays(selectedDay.date, -DAYS_IN_A_WEEK);
		onSelectDay(previousWeekDay);
	};
	const showNextWeek = () => {
		const nextWeekDay = addDays(selectedDay.date, DAYS_IN_A_WEEK);
		onSelectDay(nextWeekDay);
	};

	return (
		<div className="flex flex-col">
			<div className="flex items-center gap-1 hairline-b border-border px-1 py-2">
				<button
					type="button"
					onClick={showPreviousWeek}
					aria-label={t('dashboard.calendar.PREVIOUS', { view: 'week' })}
					className={STEP_BUTTON}
				>
					<ChevronLeft />
				</button>
				<div
					role="listbox"
					aria-label={t('dashboard.calendar.WEEK_STRIP_LABEL')}
					className="grid flex-1 grid-cols-7"
				>
					{weekDates.map((date) => {
						const key = localDayKeyOf(date);
						const isSelected = isSameDay(date, selectedDay.date);
						const isDayToday = isToday(date);
						const trackedSeconds = trackedByDay.get(key) ?? 0;
						const hasTime = trackedSeconds > 0;
						const showsDot = hasTime && !isLoading;
						const weekdayShort = formatters.weekdayShort(date);
						const dayNumber = formatters.dayNumber(date);
						return (
							<button
								key={key}
								type="button"
								role="option"
								aria-selected={isSelected}
								onClick={() => onSelectDay(date)}
								className="flex flex-col items-center gap-1 rounded-md py-1 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
							>
								<span className="text-[11px] text-muted-foreground">{weekdayShort}</span>
								<span
									className={cn(
										'flex size-8 items-center justify-center rounded-full text-[13px] font-medium tabular-nums',
										dayButtonClassOf(isSelected, isDayToday)
									)}
								>
									{dayNumber}
								</span>
								<span
									aria-hidden="true"
									className={cn('size-1 rounded-full', showsDot && 'bg-foreground/40')}
								/>
								{showsDot && <span className="sr-only">{t('dashboard.calendar.HAS_TIME')}</span>}
							</button>
						);
					})}
				</div>
				<button
					type="button"
					onClick={showNextWeek}
					aria-label={t('dashboard.calendar.NEXT', { view: 'week' })}
					className={STEP_BUTTON}
				>
					<ChevronRight />
				</button>
			</div>
			<div className="flex flex-col gap-4 px-4 py-4">
				<div className="flex flex-col gap-0.5">
					<h2 className="text-[13px] font-semibold text-foreground">{dayTitle}</h2>
					{!isLoading && <DaySummary day={selectedDay} />}
				</div>
				{!isLoading && (
					<DayDetails day={selectedDay} formatters={formatters} handlers={handlers} onAddTime={onAddTime} />
				)}
			</div>
		</div>
	);
}
