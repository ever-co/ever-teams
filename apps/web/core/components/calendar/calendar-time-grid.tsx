'use client';

import {
	type CSSProperties,
	type MouseEvent,
	type PointerEvent,
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
import type { CalendarEntryMoves } from '@/core/hooks/calendar/use-calendar-entry-moves';
import {
	type CalendarGridDrag,
	DAY_COLUMN_ATTRIBUTE,
	type GridDragKind,
	type GridDragPreview,
	type GridPress,
	useCalendarGridDrag
} from '@/core/hooks/calendar/use-calendar-grid-drag';
import { useNowMinute } from '@/core/hooks/calendar/use-now-minute';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import { edgesOnDay, type ResizeEdge } from '@/core/lib/utils/calendar-drag';
import {
	type CalendarGridSettings,
	gridHeightOf,
	type GridHourEdge,
	gridHourLabelsOf,
	gridMinuteAtOffset,
	gridOffsetOfMinute,
	gridWindowOf,
	hourHeightOf
} from '@/core/lib/utils/calendar-grid-settings';
import {
	type CalendarDay,
	type CalendarEntry,
	hourLabelsOf,
	isWeekendDay,
	placedEntriesOf,
	type PlacedEntry,
	scrollHourOf,
	shortTimeZoneNameOf,
	slotStartAt
} from '@/core/lib/utils/calendar-view';
import type { TimeWindow } from '@/core/lib/utils/dashboards/timesheet-sheet-edit';
import type { TimesheetFormatters } from '@/core/lib/utils/dashboards/timesheets';
import {
	blockHeightOfMinutes,
	CALENDAR_ACTION,
	COMPACT_BLOCK_HEIGHT_PX,
	ENTRY_BAR,
	entryFillOf,
	entryToneStyle,
	hourLinesStyleOf,
	RESIZABLE_BLOCK_HEIGHT_PX,
	RESIZE_EDGE,
	WEEKEND_TINT
} from './calendar-recipes';
import { type CalendarMenuAnchor, type CalendarMenuTarget, pointAnchor } from './calendar-context-menu';
import { type DayGhost, dayGhostOf, DragGhost, type GridGeometry } from './calendar-drag-ghost';
import { type EntryHandlers, entryRangeTextOf, useEntryTitle } from './calendar-entry-parts';
import { EntryDetails } from './calendar-entry-details';

const GUTTER_WIDTH = '3.5rem';

/** The scroll area is at least this tall, or as tall as a shorter grid. */
const MIN_SCROLL_HEIGHT_PX = 320;

const MINUTES_PER_HOUR = 60;

/** Two pixels between blocks that share a column, so overlapping logs read as two. */
const BLOCK_GAP_PX = 2;

/** An inner hour is named at its line; the first and last hours of a shorter window sit inside its edges. */
const HOUR_LABEL_PLACES: Record<GridHourEdge, string> = {
	top: 'translate-y-0.5',
	inside: '-translate-y-1/2',
	bottom: '-translate-y-[calc(100%+2px)]'
};

function gridColumnsOf(dayCount: number): CSSProperties {
	return { gridTemplateColumns: `${GUTTER_WIDTH} repeat(${dayCount}, minmax(0, 1fr))` };
}

function blockHeightOf(placed: PlacedEntry, hourHeightPx: number) {
	const minutes = placed.endMinute - placed.startMinute;
	return blockHeightOfMinutes(minutes, hourHeightPx);
}

function isInsideWindow(minute: number, geometry: GridGeometry) {
	return minute >= geometry.window.firstMinute && minute <= geometry.window.lastMinute;
}

type GridDragStarts = Pick<CalendarGridDrag, 'beginCreate' | 'beginMove' | 'beginPress' | 'beginResize'>;

type OpenMenu = (target: CalendarMenuTarget) => void;

/** A finger's long press opens the menu when it lifts (the drag hook's press): the browser's own menu is dropped. */
function isTouchContextMenu(event: MouseEvent<HTMLElement>) {
	const nativeEvent = event.nativeEvent as Partial<globalThis.PointerEvent>;
	return nativeEvent.pointerType === 'touch';
}

/** The context menu key and Shift+F10 send no pointer position: the menu opens against the element. */
function isKeyboardContextMenu(event: MouseEvent<HTMLElement>) {
	return event.clientX === 0 && event.clientY === 0;
}

const DRAG_CURSORS: Record<GridDragKind, string> = {
	create: '',
	move: '[&_*]:cursor-grabbing!',
	resize: '[&_*]:cursor-ns-resize!'
};

function dragCursorOf(kind: GridDragKind | null) {
	if (!kind) {
		return '';
	}
	return DRAG_CURSORS[kind];
}

function draggedEntryIdOf(preview: GridDragPreview | null) {
	if (preview?.kind !== 'entry') {
		return null;
	}
	return preview.entry.id;
}

function blockBoxOf(placed: PlacedEntry, geometry: GridGeometry): CSSProperties {
	const top = gridOffsetOfMinute(placed.startMinute, geometry.window, geometry.hourHeightPx);
	const height = blockHeightOf(placed, geometry.hourHeightPx);
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
	day,
	formatters,
	handlers,
	isDraggable,
	isDragged,
	dragStarts,
	geometry,
	onOpenMenu
}: Readonly<{
	placed: PlacedEntry;
	day: CalendarDay;
	formatters: TimesheetFormatters;
	handlers: EntryHandlers;
	isDraggable: boolean;
	isDragged: boolean;
	dragStarts: GridDragStarts;
	geometry: GridGeometry;
	onOpenMenu?: OpenMenu;
}>) {
	const t = useTranslations();
	const [isOpen, setIsOpen] = useState(false);
	const entry = placed.entry;
	const title = useEntryTitle(entry);
	const runningLabel = t('dashboard.timesheets.RUNNING');
	const rangeText = entryRangeTextOf(entry, formatters, runningLabel);
	const duration = formatDurationShort(entry.durationSeconds);
	const blockHeight = blockHeightOf(placed, geometry.hourHeightPx);
	const isCompact = blockHeight < COMPACT_BLOCK_HEIGHT_PX;
	const fill = entryFillOf(entry.isManual);
	const box = blockBoxOf(placed, geometry);
	const toneStyle = entryToneStyle(entry.projectColor, entry.projectKey);
	const label = t('dashboard.calendar.ENTRY_LABEL', { title, range: rangeText, duration });
	const close = () => setIsOpen(false);
	const edges = edgesOnDay(entry, day.date);
	const isResizable = isDraggable && blockHeight >= RESIZABLE_BLOCK_HEIGHT_PX;
	const showsStartEdge = isResizable && edges.hasStart;
	const showsEndEdge = isResizable && edges.hasEnd;

	// An entry that does not move still opens its menu under a held finger
	let startPointer: ((event: PointerEvent<HTMLElement>) => void) | undefined;
	if (isDraggable) {
		startPointer = (event) => dragStarts.beginMove(day, entry, event);
	} else if (onOpenMenu) {
		startPointer = (event) => dragStarts.beginPress(day, entry, event);
	}
	const startResize = (edge: ResizeEdge) => (event: PointerEvent<HTMLElement>) => {
		dragStarts.beginResize(day, entry, edge, event);
	};

	const openMenu = (event: MouseEvent<HTMLButtonElement>) => {
		if (!onOpenMenu) {
			return;
		}
		event.preventDefault();
		if (isTouchContextMenu(event)) {
			return;
		}
		let anchor: CalendarMenuAnchor = pointAnchor(event.clientX, event.clientY);
		if (isKeyboardContextMenu(event)) {
			anchor = event.currentTarget;
		}
		setIsOpen(false);
		onOpenMenu({ kind: 'entry', entry, anchor });
	};

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					aria-label={label}
					style={{ ...box, ...toneStyle }}
					onPointerDown={startPointer}
					onContextMenu={openMenu}
					className={cn(
						'absolute z-[1] flex min-w-0 flex-col overflow-hidden rounded-md py-1 pr-1.5 pl-2.5 text-left hairline-ring ring-foreground/5',
						fill,
						CALENDAR_ACTION,
						'data-[state=open]:ring-foreground/25',
						isDraggable && 'cursor-grab',
						isDragged && 'opacity-40'
					)}
				>
					<span className={ENTRY_BAR} />
					{showsStartEdge && (
						<span
							aria-hidden="true"
							onPointerDown={startResize('start')}
							className={cn(RESIZE_EDGE, 'top-0')}
						/>
					)}
					{showsEndEdge && (
						<span
							aria-hidden="true"
							onPointerDown={startResize('end')}
							className={cn(RESIZE_EDGE, 'bottom-0')}
						/>
					)}
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

function NowLine({ geometry }: Readonly<{ geometry: GridGeometry }>) {
	const minute = useNowMinute();
	if (!isInsideWindow(minute, geometry)) {
		return null;
	}
	const top = gridOffsetOfMinute(minute, geometry.window, geometry.hourHeightPx);
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

function NowPill({ formatters, geometry }: Readonly<{ formatters: TimesheetFormatters; geometry: GridGeometry }>) {
	const minute = useNowMinute();
	if (!isInsideWindow(minute, geometry)) {
		return null;
	}
	const top = gridOffsetOfMinute(minute, geometry.window, geometry.hourHeightPx);
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
	ghost,
	draggedEntryId,
	canDragEntry,
	dragStarts,
	geometry,
	onAddTime,
	onOpenMenu
}: Readonly<{
	day: CalendarDay;
	formatters: TimesheetFormatters;
	handlers: EntryHandlers;
	isLoading: boolean;
	ghost: DayGhost | null;
	draggedEntryId: string | null;
	canDragEntry: (entry: CalendarEntry) => boolean;
	dragStarts: GridDragStarts;
	geometry: GridGeometry;
	onAddTime: (start: Date) => void;
	onOpenMenu?: OpenMenu;
}>) {
	const placedEntries = useMemo(() => placedEntriesOf(day.entries, day.date), [day.date, day.entries]);
	const isDayToday = isToday(day.date);
	const isWeekend = isWeekendDay(day.date);
	const showsEntries = !isLoading;
	const dayDate = day.date;
	const dayColumnMark = { [DAY_COLUMN_ATTRIBUTE]: day.key };
	const hourLinesStyle = useMemo(() => hourLinesStyleOf(geometry.hourHeightPx), [geometry.hourHeightPx]);

	const slotAtPointer = useCallback(
		(event: MouseEvent<HTMLButtonElement>) => {
			const bounds = event.currentTarget.getBoundingClientRect();
			const offsetY = event.clientY - bounds.top;
			const minutesFromMidnight = gridMinuteAtOffset(offsetY, geometry.window, geometry.hourHeightPx);
			return slotStartAt(dayDate, minutesFromMidnight);
		},
		[dayDate, geometry]
	);
	const addTimeAtPointer = (event: MouseEvent<HTMLButtonElement>) => onAddTime(slotAtPointer(event));
	const openSlotMenu = (event: MouseEvent<HTMLButtonElement>) => {
		if (!onOpenMenu) {
			return;
		}
		event.preventDefault();
		if (isTouchContextMenu(event)) {
			return;
		}
		const anchor = pointAnchor(event.clientX, event.clientY);
		onOpenMenu({ kind: 'slot', start: slotAtPointer(event), anchor });
	};
	const startSelection = (event: PointerEvent<HTMLElement>) => dragStarts.beginCreate(day, event);
	return (
		<div
			role="gridcell"
			style={hourLinesStyle}
			className={cn('relative hairline-l border-border', isWeekend && WEEKEND_TINT)}
			{...dayColumnMark}
		>
			<button
				type="button"
				tabIndex={-1}
				aria-hidden="true"
				onClick={addTimeAtPointer}
				onPointerDown={startSelection}
				onContextMenu={openSlotMenu}
				className="absolute inset-0 cursor-cell outline-none"
			/>
			<div className="pointer-events-none absolute inset-y-0 right-0 left-0.5 [&>*]:pointer-events-auto">
				{showsEntries &&
					placedEntries.map((placed) => (
						<TimeBlock
							key={placed.entry.id}
							placed={placed}
							day={day}
							formatters={formatters}
							handlers={handlers}
							isDraggable={canDragEntry(placed.entry)}
							isDragged={placed.entry.id === draggedEntryId}
							dragStarts={dragStarts}
							geometry={geometry}
							onOpenMenu={onOpenMenu}
						/>
					))}
			</div>
			{ghost && (
				<div className="pointer-events-none absolute inset-y-0 right-0.5 left-0.5">
					<DragGhost ghost={ghost} formatters={formatters} geometry={geometry} />
				</div>
			)}
			{isDayToday && <NowLine geometry={geometry} />}
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
 * header, and the logs as blocks placed by their start and end, side by side where they overlap. The grid draws the
 * hours and row height of the person's settings, widened to any entry outside them, and opens on the first entry of
 * the shown days, or on 08:00. Empty time is dragged to select a new entry; an entry added by hand is dragged to
 * another time or day, and by its edges to a new start or end, in the settings' step. A right click, the context
 * menu key or a held finger opens the menu of an entry or of empty time.
 */
export function CalendarTimeGrid({
	days,
	formatters,
	handlers,
	timeZone,
	isLoading,
	moves,
	settings,
	onAddTime,
	onAddTimeRange,
	onOpenDay,
	onOpenMenu
}: Readonly<{
	days: ReadonlyArray<CalendarDay>;
	formatters: TimesheetFormatters;
	handlers: EntryHandlers;
	timeZone: string;
	isLoading: boolean;
	moves: CalendarEntryMoves;
	settings: CalendarGridSettings;
	onAddTime: (start: Date) => void;
	onAddTimeRange: (range: TimeWindow) => void;
	onOpenDay?: (date: Date) => void;
	onOpenMenu?: OpenMenu;
}>) {
	const t = useTranslations();
	const locale = useLocale();
	const scrollRef = useRef<HTMLDivElement>(null);
	const bodyRef = useRef<HTMLDivElement>(null);
	const geometry = useMemo<GridGeometry>(
		() => ({ window: gridWindowOf(days, settings), hourHeightPx: hourHeightOf(settings.rowHeight) }),
		[days, settings]
	);
	const openPressMenu = useCallback(
		(press: GridPress) => {
			if (!onOpenMenu) {
				return;
			}
			const anchor = pointAnchor(press.clientX, press.clientY);
			if (press.kind === 'entry') {
				onOpenMenu({ kind: 'entry', entry: press.entry, anchor });
				return;
			}
			const start = slotStartAt(press.day.date, press.minute);
			onOpenMenu({ kind: 'slot', start, anchor });
		},
		[onOpenMenu]
	);
	const drag = useCalendarGridDrag({
		days,
		hourHeightPx: geometry.hourHeightPx,
		gridWindow: geometry.window,
		stepMinutes: settings.snapMinutes,
		bodyRef,
		scrollRef,
		creatableSpot: moves.creatableSpot,
		onCreateRefused: moves.announceCreateRefusal,
		onCreateRange: onAddTimeRange,
		onMoveEntry: moves.moveEntry,
		onPress: onOpenMenu ? openPressMenu : undefined
	});
	const { beginCreate, beginMove, beginPress, beginResize } = drag;
	const dragStarts = useMemo<GridDragStarts>(
		() => ({ beginCreate, beginMove, beginPress, beginResize }),
		[beginCreate, beginMove, beginPress, beginResize]
	);
	const isDragging = drag.activeKind !== null;
	const dragCursor = dragCursorOf(drag.activeKind);
	const draggedEntryId = draggedEntryIdOf(drag.preview);
	const firstDay = days[0];
	const firstDate = firstDay?.date;
	const dayCount = days.length;
	const hasManyDays = dayCount > 1;
	const columnsStyle = gridColumnsOf(dayCount);
	const { window: gridWindow, hourHeightPx } = geometry;
	const hourLabels = useMemo(() => {
		const labelDay = firstDate ?? new Date();
		const texts = new Map(hourLabelsOf(locale, labelDay).map((item) => [item.hour, item.label]));
		return gridHourLabelsOf(gridWindow).map((item) => ({ ...item, label: texts.get(item.hour) ?? '' }));
	}, [firstDate, gridWindow, locale]);
	const zoneName = useMemo(() => shortTimeZoneNameOf(locale, timeZone, new Date()), [locale, timeZone]);
	const hasToday = days.some((day) => isToday(day.date));
	const firstKey = firstDay?.key ?? '';
	const gridHeight = gridHeightOf(gridWindow, hourHeightPx);
	const scrollMinHeight = Math.min(MIN_SCROLL_HEIGHT_PX, gridHeight);
	const scrollKey = `${firstKey}:${dayCount}:${isLoading}:${gridWindow.firstMinute}:${hourHeightPx}`;

	const scrollToFirstEntry = useEffectEvent(() => {
		const container = scrollRef.current;
		if (!container) {
			return;
		}
		const scrollMinute = scrollHourOf(days) * MINUTES_PER_HOUR;
		const offset = gridOffsetOfMinute(scrollMinute, gridWindow, hourHeightPx);
		container.scrollTop = Math.max(offset, 0);
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
					onClickCapture={drag.dropClickAfterDrag}
					style={{ minHeight: scrollMinHeight }}
					className={cn(
						'relative max-h-[min(44rem,calc(100dvh-15rem))] overflow-y-auto overscroll-contain [scrollbar-gutter:stable] [-webkit-touch-callout:none]',
						isDragging && 'select-none',
						dragCursor
					)}
				>
					<div
						ref={bodyRef}
						role="row"
						style={{ ...columnsStyle, height: gridHeight }}
						className="relative grid"
					>
						<div role="rowheader" aria-hidden="true" className="relative">
							{hourLabels.map((item) => (
								<span
									key={item.hour}
									style={{
										top: gridOffsetOfMinute(item.hour * MINUTES_PER_HOUR, gridWindow, hourHeightPx)
									}}
									className={cn(
										'absolute right-1.5 text-[10px] tabular-nums text-muted-foreground',
										HOUR_LABEL_PLACES[item.edge]
									)}
								>
									{item.label}
								</span>
							))}
							{hasToday && <NowPill formatters={formatters} geometry={geometry} />}
						</div>
						{days.map((day) => (
							<DayColumn
								key={day.key}
								day={day}
								formatters={formatters}
								handlers={handlers}
								isLoading={isLoading}
								ghost={dayGhostOf(drag.preview, day)}
								draggedEntryId={draggedEntryId}
								canDragEntry={moves.canDragEntry}
								dragStarts={dragStarts}
								geometry={geometry}
								onAddTime={onAddTime}
								onOpenMenu={onOpenMenu}
							/>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
