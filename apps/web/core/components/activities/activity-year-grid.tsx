'use client';

import {
	type KeyboardEvent,
	memo,
	type PointerEvent,
	type RefObject,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState
} from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { TOOLTIP_SURFACE } from '@/core/components/common/menu-recipes';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import {
	ACTIVITY_LEVEL_TONES,
	startDayIndexOf,
	WEEKDAY_COUNT,
	YEAR_CELL,
	YEAR_CELL_PX,
	YEAR_CELLS_GRID,
	YEAR_MONTH_LABELS,
	YEAR_SCROLLER,
	YEAR_STEP_PX,
	YEAR_WEEKDAY_COLUMN,
	type YearDay,
	type YearLayout
} from './activity-year';
import { chartSliderValue } from '@/core/lib/utils/chart-slider';

type Translate = ReturnType<typeof useTranslations>;

interface YearGridFormats {
	day: Intl.DateTimeFormat;
	month: Intl.DateTimeFormat;
	weekday: Intl.DateTimeFormat;
}

/** Arrow keys walk the grid as it is drawn: a column is a week, a row is a weekday. */
const KEY_STEPS: Record<string, number> = {
	ArrowLeft: -WEEKDAY_COUNT,
	ArrowRight: WEEKDAY_COUNT,
	ArrowUp: -1,
	ArrowDown: 1
};

/** 1 January 2024 was a Monday: the rows 0, 2 and 4 name Monday, Wednesday and Friday. */
const LABELLED_WEEKDAYS = new Map([
	[0, Date.UTC(2024, 0, 1)],
	[2, Date.UTC(2024, 0, 3)],
	[4, Date.UTC(2024, 0, 5)]
]);

const WEEKDAY_ROWS = [0, 1, 2, 3, 4, 5, 6];

/** Rows above this one show the bubble under the day, so it never leaves the scrolling area at the top. */
const BUBBLE_FLIP_ROW = 3;

/** Columns this close to an edge align the bubble with that edge instead of centring it. */
const BUBBLE_EDGE_COLUMNS = 8;

const BUBBLE_GAP_PX = 4;

const HALF_CELL_PX = YEAR_CELL_PX / 2;

const CELL_GAP_PX = YEAR_STEP_PX - YEAR_CELL_PX;

const REVEAL_MARGIN_PX = 12;

const FUTURE_CELL = 'hairline-border border-dashed border-foreground/20';

const TODAY_CELL = 'outline-1 outline-offset-1 outline-foreground/60';

function formatsOf(locale: string): YearGridFormats {
	return {
		day: new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }),
		month: new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }),
		weekday: new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' })
	};
}

function cellClassOf(day: YearDay) {
	if (day.isFuture) {
		return cn(YEAR_CELL, FUTURE_CELL);
	}
	const tone = ACTIVITY_LEVEL_TONES[day.level];
	if (day.isToday) {
		return cn(YEAR_CELL, tone, TODAY_CELL);
	}
	return cn(YEAR_CELL, tone);
}

function dayTextOf(day: YearDay, format: Intl.DateTimeFormat, t: Translate) {
	const date = format.format(day.date);
	if (day.isFuture) {
		return date;
	}
	const hasTime = day.seconds > 0;
	if (!hasTime) {
		return t('profile.activity.DAY_NO_TIME', { date });
	}
	const duration = formatDurationShort(day.seconds);
	return t('profile.activity.DAY_TRACKED', { duration, date });
}

function dayIndexOfTarget(target: EventTarget) {
	if (!(target instanceof HTMLElement)) {
		return null;
	}
	const rawIndex = target.dataset.dayIndex;
	if (rawIndex === undefined) {
		return null;
	}
	return Number(rawIndex);
}

function clampedIndex(index: number, count: number) {
	const lastIndex = count - 1;
	const atLeastFirst = Math.max(index, 0);
	return Math.min(atLeastFirst, lastIndex);
}

/** Scrolls the grid sideways just enough for the cell to show, never the page. */
function revealCell(scroller: HTMLElement, cell: HTMLElement) {
	const scrollerBox = scroller.getBoundingClientRect();
	const cellBox = cell.getBoundingClientRect();
	const visibleStart = scrollerBox.left + REVEAL_MARGIN_PX;
	const visibleEnd = scrollerBox.right - REVEAL_MARGIN_PX;
	if (cellBox.left < visibleStart) {
		const shift = visibleStart - cellBox.left;
		scroller.scrollLeft -= shift;
		return;
	}
	if (cellBox.right > visibleEnd) {
		const shift = cellBox.right - visibleEnd;
		scroller.scrollLeft += shift;
	}
}

function dayAt(days: ReadonlyArray<YearDay>, index: number | null) {
	if (index === null) {
		return null;
	}
	return days[index] ?? null;
}

function cellOf(cells: HTMLElement | null, index: number) {
	if (!cells) {
		return null;
	}
	return cells.querySelector<HTMLElement>(`[data-day-index="${index}"]`);
}

function revealDay(
	scrollerRef: RefObject<HTMLDivElement | null>,
	cellsRef: RefObject<HTMLDivElement | null>,
	index: number
) {
	const scroller = scrollerRef.current;
	const cell = cellOf(cellsRef.current, index);
	if (!scroller) {
		return;
	}
	if (!cell) {
		return;
	}
	revealCell(scroller, cell);
}

function bubbleAlignmentOf(column: number, columnCount: number) {
	if (column < BUBBLE_EDGE_COLUMNS) {
		return '-translate-x-2';
	}
	const lastAlignedColumn = columnCount - BUBBLE_EDGE_COLUMNS;
	if (column > lastAlignedColumn) {
		return '-translate-x-[calc(100%-0.5rem)]';
	}
	return '-translate-x-1/2';
}

const YearCells = memo(function YearCells({ layout }: Readonly<{ layout: YearLayout }>) {
	const blanks = Array.from({ length: layout.leadingBlanks }, (_, index) => index);
	return (
		<div className={YEAR_CELLS_GRID}>
			{blanks.map((blank) => (
				<span key={`blank-${blank}`} aria-hidden="true" />
			))}
			{layout.days.map((day) => (
				<span key={day.key} data-day-index={day.index} className={cellClassOf(day)} />
			))}
		</div>
	);
});

function ActiveDayMark({ day }: Readonly<{ day: YearDay }>) {
	const left = day.column * YEAR_STEP_PX;
	const top = day.row * YEAR_STEP_PX;
	return (
		<span
			aria-hidden="true"
			className="pointer-events-none absolute size-[11px] rounded-[3px] outline-2 outline-offset-1 outline-primary-ink"
			style={{ left, top }}
		/>
	);
}

function DayBubble({ day, columnCount, text }: Readonly<{ day: YearDay; columnCount: number; text: string }>) {
	const cellLeft = day.column * YEAR_STEP_PX;
	const left = cellLeft + HALF_CELL_PX;
	const cellTop = day.row * YEAR_STEP_PX;
	const placesBelow = day.row < BUBBLE_FLIP_ROW;
	const alignment = bubbleAlignmentOf(day.column, columnCount);
	let top = cellTop - BUBBLE_GAP_PX;
	let placement = '-translate-y-full';
	if (placesBelow) {
		const cellBottom = cellTop + YEAR_CELL_PX;
		top = cellBottom + BUBBLE_GAP_PX;
		placement = 'translate-y-0';
	}
	return (
		<div className={cn('pointer-events-none absolute z-10', alignment, placement)} style={{ left, top }}>
			<div className={cn(TOOLTIP_SURFACE, 'max-w-none whitespace-nowrap tabular-nums')}>{text}</div>
		</div>
	);
}

function MonthLabels({ layout, format }: Readonly<{ layout: YearLayout; format: Intl.DateTimeFormat }>) {
	const columnsWidth = layout.columnCount * YEAR_STEP_PX;
	const width = columnsWidth - CELL_GAP_PX;
	return (
		<div aria-hidden="true" className={YEAR_MONTH_LABELS} style={{ width }}>
			{layout.monthColumns.map(({ month, column }) => {
				const left = column * YEAR_STEP_PX;
				const monthTime = Date.UTC(layout.year, month, 1);
				const monthName = format.format(new Date(monthTime));
				return (
					<span
						key={month}
						className="absolute top-0 text-[10px] leading-4 capitalize text-muted-foreground"
						style={{ left }}
					>
						{monthName}
					</span>
				);
			})}
		</div>
	);
}

function WeekdayLabels({ format }: Readonly<{ format: Intl.DateTimeFormat }>) {
	return (
		<div aria-hidden="true" className={YEAR_WEEKDAY_COLUMN}>
			{WEEKDAY_ROWS.map((row) => {
				const referenceTime = LABELLED_WEEKDAYS.get(row);
				if (referenceTime === undefined) {
					return <span key={row} />;
				}
				const weekdayName = format.format(new Date(referenceTime));
				return (
					<span key={row} className="truncate capitalize">
						{weekdayName}
					</span>
				);
			})}
		</div>
	);
}

function YearDaysTable({
	layout,
	format,
	t
}: Readonly<{ layout: YearLayout; format: Intl.DateTimeFormat; t: Translate }>) {
	const trackedDays = layout.days.filter((day) => day.seconds > 0);
	const yearText = String(layout.year);
	return (
		<table className="sr-only">
			<caption>{t('profile.activity.TABLE_CAPTION', { year: yearText })}</caption>
			<tbody>
				{trackedDays.map((day) => (
					<tr key={day.key}>
						<th scope="row">{format.format(day.date)}</th>
						<td>{formatDurationShort(day.seconds)}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

/**
 * The year as weeks of small squares in one hue (the person record of user-organisation-profile.webp, the streak
 * heatmap of rico-ab): month names above, Monday, Wednesday and Friday at the left, today outlined, days ahead
 * dashed. One bubble follows the pointer and the arrow keys; a hidden table carries the days for screen readers.
 */
export const ActivityYearGrid = memo(function ActivityYearGrid({ layout }: Readonly<{ layout: YearLayout }>) {
	const t = useTranslations();
	const locale = useLocale();
	const formats = useMemo(() => formatsOf(locale), [locale]);
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	const scrollerRef = useRef<HTMLDivElement>(null);
	const cellsRef = useRef<HTMLDivElement>(null);
	const movedByKeyRef = useRef(false);
	const dayCount = layout.days.length;
	const activeDay = dayAt(layout.days, activeIndex);
	let activeDayText: string | undefined;
	if (activeDay) {
		activeDayText = dayTextOf(activeDay, formats.day, t);
	}

	useEffect(() => {
		const scroller = scrollerRef.current;
		if (!scroller) {
			return;
		}
		const today = layout.days.find((day) => day.isToday);
		if (!today) {
			scroller.scrollLeft = 0;
			return;
		}
		revealDay(scrollerRef, cellsRef, today.index);
	}, [layout]);

	useEffect(() => {
		const isKeyboardMove = movedByKeyRef.current;
		movedByKeyRef.current = false;
		if (activeIndex === null) {
			return;
		}
		if (!isKeyboardMove) {
			return;
		}
		revealDay(scrollerRef, cellsRef, activeIndex);
	}, [activeIndex]);

	const handlePointer = useCallback((event: PointerEvent<HTMLDivElement>) => {
		const index = dayIndexOfTarget(event.target);
		if (index === null) {
			return;
		}
		setActiveIndex(index);
	}, []);

	const clearActiveDay = useCallback(() => setActiveIndex(null), []);

	const handleFocus = useCallback(() => {
		setActiveIndex((current) => {
			if (current !== null) {
				return current;
			}
			return startDayIndexOf(layout);
		});
	}, [layout]);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLDivElement>) => {
			if (event.key === 'Escape') {
				setActiveIndex(null);
				return;
			}
			const step = KEY_STEPS[event.key];
			if (step === undefined) {
				return;
			}
			event.preventDefault();
			movedByKeyRef.current = true;
			setActiveIndex((current) => {
				const start = current ?? startDayIndexOf(layout);
				const next = start + step;
				return clampedIndex(next, dayCount);
			});
		},
		[dayCount, layout]
	);

	const yearText = String(layout.year);
	const ariaLabel = t('profile.activity.GRID_LABEL', { year: yearText });

	const slider = chartSliderValue(activeIndex, dayCount, activeDayText);
	return (
		<div className="flex flex-col">
			<div ref={scrollerRef} className={YEAR_SCROLLER}>
				<div className="w-max">
					<MonthLabels layout={layout} format={formats.month} />
					<div className="flex gap-1">
						<WeekdayLabels format={formats.weekday} />
						<div
							ref={cellsRef}
							tabIndex={0}
							role="slider"
							aria-orientation="horizontal"
							aria-valuemin={slider.min}
							aria-valuemax={slider.max}
							aria-valuenow={slider.now}
							aria-valuetext={slider.text}
							aria-label={ariaLabel}
							onPointerMove={handlePointer}
							onPointerDown={handlePointer}
							onPointerLeave={clearActiveDay}
							onFocus={handleFocus}
							onBlur={clearActiveDay}
							onKeyDown={handleKeyDown}
							className="relative rounded-[3px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
						>
							<YearCells layout={layout} />
							{activeDay && <ActiveDayMark day={activeDay} />}
							{activeDay && (
								<DayBubble
									day={activeDay}
									columnCount={layout.columnCount}
									text={dayTextOf(activeDay, formats.day, t)}
								/>
							)}
						</div>
					</div>
				</div>
			</div>
			<YearDaysTable layout={layout} format={formats.day} t={t} />
		</div>
	);
});
