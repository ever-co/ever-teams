'use client';

import type { CSSProperties } from 'react';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import { type MinuteRange, rangeOnDay } from '@/core/lib/utils/calendar-drag';
import type { CalendarDay, CalendarEntry } from '@/core/lib/utils/calendar-view';
import type { TimeWindow } from '@/core/lib/utils/dashboards/timesheet-sheet-edit';
import type { TimesheetFormatters } from '@/core/lib/utils/dashboards/timesheets';
import type { GridDragPreview } from '@/core/hooks/calendar/use-calendar-grid-drag';
import {
	blockHeightOfMinutes,
	COMPACT_BLOCK_HEIGHT_PX,
	ENTRY_BAR,
	entryFillOf,
	entryToneStyle,
	pixelsOfMinutes,
	SELECTION_GHOST
} from './calendar-recipes';
import { useEntryTitle } from './calendar-entry-parts';

const MILLISECONDS_PER_SECOND = 1000;

export interface DayGhost {
	range: MinuteRange;
	window: TimeWindow;
	entry: CalendarEntry | null;
}

/** The part of the drag drawn in one day's column: a selection stays in its day, a moved entry may cover two. */
export function dayGhostOf(preview: GridDragPreview | null, day: CalendarDay): DayGhost | null {
	if (!preview) {
		return null;
	}
	const isOtherDaySelection = preview.kind === 'create' && preview.dayKey !== day.key;
	if (isOtherDaySelection) {
		return null;
	}
	const range = rangeOnDay(preview.window, day.date);
	if (!range) {
		return null;
	}
	if (preview.kind === 'create') {
		return { range, window: preview.window, entry: null };
	}
	return { range, window: preview.window, entry: preview.entry };
}

function ghostBoxOf(range: MinuteRange): CSSProperties {
	const top = pixelsOfMinutes(range.startMinute);
	const height = blockHeightOfMinutes(range.endMinute - range.startMinute);
	return { top, height };
}

function isCompactRange(range: MinuteRange) {
	const height = blockHeightOfMinutes(range.endMinute - range.startMinute);
	return height < COMPACT_BLOCK_HEIGHT_PX;
}

function windowTextsOf(window: TimeWindow, formatters: TimesheetFormatters) {
	const startText = formatters.time(window.start);
	const endText = formatters.time(window.end);
	const elapsedMilliseconds = window.end.getTime() - window.start.getTime();
	const seconds = Math.round(elapsedMilliseconds / MILLISECONDS_PER_SECOND);
	return { rangeText: `${startText} – ${endText}`, duration: formatDurationShort(seconds) };
}

const GHOST_FRAME =
	'pointer-events-none absolute inset-x-0 z-[3] flex min-w-0 flex-col overflow-hidden rounded-md py-1 pr-1.5 pl-2.5';

function GhostTimes({
	rangeText,
	duration,
	isCompact
}: Readonly<{ rangeText: string; duration: string; isCompact: boolean }>) {
	if (isCompact) {
		return (
			<span className="flex min-w-0 items-baseline gap-1.5 text-[11px] leading-tight tabular-nums">
				<span className="truncate font-medium text-foreground">{rangeText}</span>
				<span className="shrink-0 text-muted-foreground">{duration}</span>
			</span>
		);
	}
	return (
		<>
			<span className="truncate text-xs font-medium tabular-nums text-foreground">{rangeText}</span>
			<span className="truncate text-[11px] tabular-nums text-muted-foreground">{duration}</span>
		</>
	);
}

function EntryGhost({
	ghost,
	entry,
	formatters
}: Readonly<{ ghost: DayGhost; entry: CalendarEntry; formatters: TimesheetFormatters }>) {
	const title = useEntryTitle(entry);
	const { rangeText, duration } = windowTextsOf(ghost.window, formatters);
	const isCompact = isCompactRange(ghost.range);
	const box = ghostBoxOf(ghost.range);
	const toneStyle = entryToneStyle(entry.projectColor, entry.projectKey);
	const fill = entryFillOf(entry.isManual);
	return (
		<div
			aria-hidden="true"
			style={{ ...box, ...toneStyle }}
			className={cn(GHOST_FRAME, 'hairline-ring ring-foreground/25', fill)}
		>
			<span className={ENTRY_BAR} />
			<GhostTimes rangeText={rangeText} duration={duration} isCompact={isCompact} />
			{!isCompact && <span className="truncate text-[11px] text-muted-foreground">{title}</span>}
		</div>
	);
}

function SelectionGhost({ ghost, formatters }: Readonly<{ ghost: DayGhost; formatters: TimesheetFormatters }>) {
	const { rangeText, duration } = windowTextsOf(ghost.window, formatters);
	const isCompact = isCompactRange(ghost.range);
	const box = ghostBoxOf(ghost.range);
	return (
		<div aria-hidden="true" style={box} className={cn(GHOST_FRAME, SELECTION_GHOST)}>
			<GhostTimes rangeText={rangeText} duration={duration} isCompact={isCompact} />
		</div>
	);
}

/** What a drag is about to do, drawn over the column with its times: the selected time, or the entry's new place. */
export function DragGhost({ ghost, formatters }: Readonly<{ ghost: DayGhost; formatters: TimesheetFormatters }>) {
	if (ghost.entry) {
		return <EntryGhost ghost={ghost} entry={ghost.entry} formatters={formatters} />;
	}
	return <SelectionGhost ghost={ghost} formatters={formatters} />;
}
