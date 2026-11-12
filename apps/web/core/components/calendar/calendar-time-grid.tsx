'use client';

import {
	type CSSProperties,
	type MouseEvent,
	memo,
	useCallback,
	useEffectEvent,
	useLayoutEffect,
	useMemo,
	useRef,
	useState
} from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { isToday } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { useNowMinute } from '@/core/hooks/calendar/use-now-minute';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import {
	type CalendarDay,
	hourLabelsOf,
	HOURS_IN_DAY,
	isWeekendDay,
	placedEntriesOf,
	type PlacedEntry,
	scrollHourOf,
	shortTimeZoneNameOf,
	slotStartAt
} from '@/core/lib/utils/calendar-view';
import type { TimesheetFormatters } from '@/core/lib/utils/dashboards/timesheets';
import {
	CALENDAR_ACTION,
	COMPACT_BLOCK_HEIGHT_PX,
	ENTRY_BAR,
	entryFillOf,
	entryToneStyle,
	HOUR_HEIGHT_PX,
	HOUR_LINES_STYLE,
	MIN_BLOCK_HEIGHT_PX,
	WEEKEND_TINT
} from './calendar-recipes';
import { type EntryHandlers, entryRangeTextOf, useEntryTitle } from './calendar-entry-parts';
import { EntryDetails } from './calendar-entry-details';

const GUTTER_WIDTH = '3.5rem';

const MINUTES_PER_HOUR = 60;

const GRID_HEIGHT_PX = HOURS_IN_DAY * HOUR_HEIGHT_PX;

/** Two pixels between blocks that share a column, so overlapping logs read as two. */
const BLOCK_GAP_PX = 2;

function gridColumnsOf(dayCount: number): CSSProperties {
	return { gridTemplateColumns: `${GUTTER_WIDTH} repeat(${dayCount}, minmax(0, 1fr))` };
}

function pixelsOfMinutes(minutes: number) {
	return (minutes / MINUTES_PER_HOUR) * HOUR_HEIGHT_PX;
}

function blockHeightOf(placed: PlacedEntry) {
	const minutes = placed.endMinute - placed.startMinute;
	const naturalHeight = pixelsOfMinutes(minutes);
	return Math.max(naturalHeight, MIN_BLOCK_HEIGHT_PX);
}

function blockBoxOf(placed: PlacedEntry): CSSProperties {
	const top = pixelsOfMinutes(placed.startMinute);
	const height = blockHeightOf(placed);
	const share = 100 / placed.columnCount;
	const left = share * placed.column;
	return {
		top,
		height,
		left: `${left}%`,
		width: `calc(${share}% - ${BLOCK_GAP_PX}px)`
	};
}

const TimeBlock = memo(function TimeBlock({
	placed,
	formatters,
	handlers
}: Readonly<{ placed: PlacedEntry; formatters: TimesheetFormatters; handlers: EntryHandlers }>) {
	const t = useTranslations();
	const [isOpen, setIsOpen] = useState(false);
	const entry = placed.entry;
	const title = useEntryTitle(entry);
	const runningLabel = t('dashboard.timesheets.RUNNING');
	const rangeText = entryRangeTextOf(entry, formatters, runningLabel);
	const duration = formatDurationShort(entry.durationSeconds);
	const blockHeight = blockHeightOf(placed);
	const isCompact = blockHeight < COMPACT_BLOCK_HEIGHT_PX;
	const fill = entryFillOf(entry.isManual);
	const box = blockBoxOf(placed);
	const toneStyle = entryToneStyle(entry.projectColor, entry.projectKey);
	const label = t('dashboard.calendar.ENTRY_LABEL', { title, range: rangeText, duration });
	const close = () => setIsOpen(false);

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					aria-label={label}
					style={{ ...box, ...toneStyle }}
					className={cn(
						'absolute z-[1] flex min-w-0 flex-col overflow-hidden rounded-md py-1 pr-1.5 pl-2.5 text-left hairline-ring ring-foreground/5',
						fill,
						CALENDAR_ACTION,
						'data-[state=open]:ring-foreground/25'
					)}
				>
					<span className={ENTRY_BAR} />
					{isCompact && (
						<span className="flex min-w-0 items-baseline gap-1.5 text-[11px] leading-tight">
							<span className="truncate font-medium text-foreground">{title}</span>
							<span className="shrink-0 tabular-nums text-muted-foreground">{duration}</span>
						</span>
					)}
					{!isCompact && (
						<>
							<span className="line-clamp-2 text-xs font-medium leading-snug text-foreground">
								{title}
							</span>
							<span className="truncate text-[11px] tabular-nums text-muted-foreground">{rangeText}</span>
							<span className="truncate text-[11px] font-medium tabular-nums text-foreground">
								{duration}
							</span>
						</>
					)}
					{entry.isManual && <span className="sr-only">{t('dashboard.calendar.LEGEND.MANUAL')}</span>}
				</button>
			</PopoverTrigger>
			<PopoverContent side="right" align="start" sideOffset={6} collisionPadding={12} className="w-80">
				<EntryDetails entry={entry} formatters={formatters} handlers={handlers} onClose={close} />
			</PopoverContent>
		</Popover>
	);
});

function NowLine() {
	const minute = useNowMinute();
	const top = pixelsOfMinutes(minute);
	return (
		<span
			aria-hidden="true"
			style={{ top }}
			className="pointer-events-none absolute inset-x-0 z-[2] h-px bg-primary"
		>
			<span className="absolute -top-[3px] -left-[3px] size-[7px] rounded-full bg-primary" />
		</span>
	);
}

function NowPill({ formatters }: Readonly<{ formatters: TimesheetFormatters }>) {
	const minute = useNowMinute();
	const top = pixelsOfMinutes(minute);
	const now = new Date();
	const timeText = formatters.time(now);
	return (
		<span
			aria-hidden="true"
			style={{ top }}
			className="pointer-events-none absolute right-1 z-[2] -translate-y-1/2 rounded-full bg-primary px-1.5 py-px text-[10px] font-medium tabular-nums text-primary-foreground"
		>
			{timeText}
		</span>
	);
}

const DayColumn = memo(function DayColumn({
	day,
	formatters,
	handlers,
	isLoading,
	onAddTime
}: Readonly<{
	day: CalendarDay;
	formatters: TimesheetFormatters;
	handlers: EntryHandlers;
	isLoading: boolean;
	onAddTime: (start: Date) => void;
}>) {
	const placedEntries = useMemo(() => placedEntriesOf(day.entries, day.date), [day.date, day.entries]);
	const isDayToday = isToday(day.date);
	const isWeekend = isWeekendDay(day.date);
	const showsEntries = !isLoading;
	const dayDate = day.date;

	const addTimeAtPointer = useCallback(
		(event: MouseEvent<HTMLButtonElement>) => {
			const bounds = event.currentTarget.getBoundingClientRect();
			const offsetY = event.clientY - bounds.top;
			const minutesFromMidnight = (offsetY / HOUR_HEIGHT_PX) * 60;
			const start = slotStartAt(dayDate, minutesFromMidnight);
			onAddTime(start);
		},
		[dayDate, onAddTime]
	);
	return (
		<div
			role="gridcell"
			style={HOUR_LINES_STYLE}
			className={cn('relative hairline-l border-border', isWeekend && WEEKEND_TINT)}
		>
			<button
				type="button"
				tabIndex={-1}
				aria-hidden="true"
				onClick={addTimeAtPointer}
				className="absolute inset-0 cursor-cell outline-none"
			/>
			<div className="pointer-events-none absolute inset-y-0 right-0 left-0.5 [&>*]:pointer-events-auto">
				{showsEntries &&
					placedEntries.map((placed) => (
						<TimeBlock key={placed.entry.id} placed={placed} formatters={formatters} handlers={handlers} />
					))}
			</div>
			{isDayToday && <NowLine />}
		</div>
	);
});

function DayHeader({
	day,
	formatters,
	isLoading,
	onOpenDay
}: Readonly<{
	day: CalendarDay;
	formatters: TimesheetFormatters;
	isLoading: boolean;
	onOpenDay?: (date: Date) => void;
}>) {
	const t = useTranslations();
	const isDayToday = isToday(day.date);
	const isWeekend = isWeekendDay(day.date);
	const weekday = formatters.weekdayShort(day.date);
	const dayNumber = formatters.dayNumber(day.date);
	const hasTime = day.trackedSeconds > 0;
	const total = formatDurationShort(day.trackedSeconds);
	const showsTotal = hasTime && !isLoading;
	const dayDate = formatters.dayDate(day.date);
	const dayLabel = t('dashboard.timesheets.DAY_LABEL', { day: weekday, date: dayDate });
	const content = (
		<>
			<span className={cn('text-xs', isDayToday && 'font-semibold text-foreground')}>
				{weekday} <span className="tabular-nums">{dayNumber}</span>
			</span>
			{isLoading && <span className={cn('h-2 w-10', SKELETON_BAR)} />}
			{showsTotal && <span className="text-[11px] tabular-nums text-muted-foreground">{total}</span>}
		</>
	);
	const cellClassName = cn(
		'flex min-h-12 flex-col items-center justify-center gap-0.5 hairline-l border-border px-1 text-muted-foreground',
		isWeekend && WEEKEND_TINT
	);
	if (!onOpenDay) {
		return (
			<div role="columnheader" className={cellClassName}>
				{content}
			</div>
		);
	}
	return (
		<div role="columnheader" className={cn(cellClassName, 'p-0')}>
			<button
				type="button"
				onClick={() => onOpenDay(day.date)}
				aria-label={t('dashboard.calendar.OPEN_DAY', { day: dayLabel })}
				className={cn(
					'flex size-full flex-col items-center justify-center gap-0.5 hover:bg-foreground/[0.03]',
					CALENDAR_ACTION
				)}
			>
				{content}
			</button>
		</div>
	);
}

/**
 * The week and day grids: an hour gutter written in the reader's zone, one column per day with its total in the
 * header, and the logs as blocks placed by their start and end, side by side where they overlap. The grid opens on
 * the first entry of the shown days, or on 08:00.
 */
export function CalendarTimeGrid({
	days,
	formatters,
	handlers,
	timeZone,
	isLoading,
	onAddTime,
	onOpenDay
}: Readonly<{
	days: ReadonlyArray<CalendarDay>;
	formatters: TimesheetFormatters;
	handlers: EntryHandlers;
	timeZone: string;
	isLoading: boolean;
	onAddTime: (start: Date) => void;
	onOpenDay?: (date: Date) => void;
}>) {
	const t = useTranslations();
	const locale = useLocale();
	const scrollRef = useRef<HTMLDivElement>(null);
	const firstDay = days[0];
	const firstDate = firstDay?.date;
	const dayCount = days.length;
	const hasManyDays = dayCount > 1;
	const columnsStyle = gridColumnsOf(dayCount);
	const hourLabels = useMemo(() => {
		const labelDay = firstDate ?? new Date();
		return hourLabelsOf(locale, labelDay);
	}, [firstDate, locale]);
	const zoneName = useMemo(() => shortTimeZoneNameOf(locale, timeZone, new Date()), [locale, timeZone]);
	const hasToday = days.some((day) => isToday(day.date));
	const firstKey = firstDay?.key ?? '';
	const scrollKey = `${firstKey}:${dayCount}:${isLoading}`;

	const scrollToFirstEntry = useEffectEvent(() => {
		const container = scrollRef.current;
		if (!container) {
			return;
		}
		const scrollHour = scrollHourOf(days);
		container.scrollTop = scrollHour * HOUR_HEIGHT_PX;
	});

	useLayoutEffect(() => {
		scrollToFirstEntry();
	}, [scrollKey]);

	return (
		<div className={cn(hasManyDays && 'overflow-x-auto')}>
			<div
				role="grid"
				aria-label={t('dashboard.calendar.GRID_LABEL')}
				className={cn(hasManyDays && 'min-w-[44rem]')}
			>
				<div
					role="row"
					style={columnsStyle}
					className="grid hairline-b border-border [scrollbar-gutter:stable] overflow-hidden"
				>
					<div
						role="columnheader"
						title={timeZone}
						className="flex items-end justify-end px-1.5 pb-1.5 text-[10px] tabular-nums text-muted-foreground"
					>
						<span className="sr-only">{t('dashboard.calendar.TIME_ZONE', { zone: timeZone })}</span>
						<span aria-hidden="true">{zoneName}</span>
					</div>
					{days.map((day) => (
						<DayHeader
							key={day.key}
							day={day}
							formatters={formatters}
							isLoading={isLoading}
							onOpenDay={onOpenDay}
						/>
					))}
				</div>
				<div
					ref={scrollRef}
					className="relative max-h-[min(44rem,calc(100dvh-15rem))] min-h-80 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]"
				>
					<div role="row" style={{ ...columnsStyle, height: GRID_HEIGHT_PX }} className="relative grid">
						<div role="rowheader" aria-hidden="true" className="relative">
							{hourLabels.map((item) => (
								<span
									key={item.hour}
									style={{ top: item.hour * HOUR_HEIGHT_PX }}
									className="absolute right-1.5 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground"
								>
									{item.label}
								</span>
							))}
							{hasToday && <NowPill formatters={formatters} />}
						</div>
						{days.map((day) => (
							<DayColumn
								key={day.key}
								day={day}
								formatters={formatters}
								handlers={handlers}
								isLoading={isLoading}
								onAddTime={onAddTime}
							/>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
