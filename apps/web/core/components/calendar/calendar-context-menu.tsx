'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator
} from '@/core/components/common/dropdown-menu';
import { Copy, Pencil, Plus, Scissors, Stop, Trash } from '@/core/components/icons';
import { useTimerActions } from '@/core/hooks/timer';
import type { CalendarEntry } from '@/core/lib/utils/calendar-view';
import type { TimesheetFormatters } from '@/core/lib/utils/dashboards/timesheets';
import { entryRangeTextOf, useEntryTitle } from './calendar-entry-parts';

/** A point on screen for a right click or a held finger, or the entry itself for the keyboard. */
export type CalendarMenuAnchor = Element | { getBoundingClientRect: () => DOMRect };

export type CalendarMenuTarget =
	| { kind: 'entry'; entry: CalendarEntry; anchor: CalendarMenuAnchor }
	| { kind: 'slot'; start: Date; anchor: CalendarMenuAnchor };

/** What the menu offers on an entry, with the rules of the entry's card and of the Timesheets row. */
export interface CalendarMenuActions {
	canEdit: (entry: CalendarEntry) => boolean;
	canDuplicate: (entry: CalendarEntry) => boolean;
	/** The viewer's own running timer: Stop. */
	canStop: (entry: CalendarEntry) => boolean;
	onEdit: (entry: CalendarEntry) => void;
	onDuplicate: (entry: CalendarEntry) => void;
	onSplit: (entry: CalendarEntry) => void;
	onDelete: (entry: CalendarEntry) => void;
	onStop: () => void;
	onAddTime: (start: Date) => void;
}

export function pointAnchor(x: number, y: number): CalendarMenuAnchor {
	return { getBoundingClientRect: () => new DOMRect(x, y, 0, 0) };
}

const MENU_HEADER = 'flex min-w-0 flex-col gap-0.5 px-2 pt-1.5 pb-1';

function EntryItems({
	entry,
	formatters,
	actions
}: Readonly<{ entry: CalendarEntry; formatters: TimesheetFormatters; actions: CalendarMenuActions }>) {
	const t = useTranslations();
	const title = useEntryTitle(entry);
	const rangeText = entryRangeTextOf(entry, formatters, t('dashboard.timesheets.RUNNING'));
	const canEdit = actions.canEdit(entry);
	const canDuplicate = actions.canDuplicate(entry);
	const canStop = actions.canStop(entry);
	const hasActions = canEdit || canDuplicate || canStop;
	return (
		<>
			<DropdownMenuLabel className={MENU_HEADER}>
				<span className="truncate text-[13px] font-medium text-foreground">{title}</span>
				<span className="truncate text-xs font-normal tabular-nums text-muted-foreground">{rangeText}</span>
			</DropdownMenuLabel>
			<DropdownMenuSeparator />
			{canStop && (
				<DropdownMenuItem onClick={actions.onStop}>
					<Stop />
					{t('dashboard.calendar.MENU.STOP')}
				</DropdownMenuItem>
			)}
			{canEdit && (
				<DropdownMenuItem onClick={() => actions.onEdit(entry)}>
					<Pencil />
					{t('common.EDIT')}
				</DropdownMenuItem>
			)}
			{canDuplicate && (
				<DropdownMenuItem onClick={() => actions.onDuplicate(entry)}>
					<Copy />
					{t('timeEntryActions.DUPLICATE')}
				</DropdownMenuItem>
			)}
			{canEdit && (
				<DropdownMenuItem onClick={() => actions.onSplit(entry)}>
					<Scissors />
					{t('dashboard.calendar.MENU.SPLIT')}
				</DropdownMenuItem>
			)}
			{canEdit && (
				<>
					<DropdownMenuSeparator />
					<DropdownMenuItem variant="destructive" onClick={() => actions.onDelete(entry)}>
						<Trash />
						{t('common.DELETE')}
					</DropdownMenuItem>
				</>
			)}
			{!hasActions && (
				<p className="px-2 py-1.5 text-xs text-muted-foreground">{t('dashboard.calendar.MENU.NO_ACTIONS')}</p>
			)}
		</>
	);
}

function SlotItems({
	start,
	formatters,
	actions
}: Readonly<{ start: Date; formatters: TimesheetFormatters; actions: CalendarMenuActions }>) {
	const t = useTranslations();
	const dayText = formatters.dayDate(start);
	const timeText = formatters.time(start);
	return (
		<>
			<DropdownMenuLabel className={MENU_HEADER}>
				<span className="truncate text-xs font-normal tabular-nums text-muted-foreground">
					{dayText} · {timeText}
				</span>
			</DropdownMenuLabel>
			<DropdownMenuItem onClick={() => actions.onAddTime(start)}>
				<Plus />
				{t('dashboard.calendar.MENU.ADD_TIME_HERE')}
			</DropdownMenuItem>
		</>
	);
}

/**
 * The single menu of the week and day grids, opened by a right click, the context menu key or Shift+F10 on an
 * entry, or a held finger. On an entry: Stop for the viewer's running timer, Edit, Duplicate, Split, and Delete last.
 * On empty time: Add time here, from the half hour under the pointer.
 */
export function CalendarContextMenu({
	target,
	isOpen,
	formatters,
	actions,
	onOpenChange,
	onClosed
}: Readonly<{
	target: CalendarMenuTarget | null;
	isOpen: boolean;
	formatters: TimesheetFormatters;
	actions: CalendarMenuActions;
	onOpenChange: (isOpen: boolean) => void;
	onClosed: () => void;
}>) {
	const handleOpenChangeComplete = (open: boolean) => {
		if (!open) {
			onClosed();
		}
	};
	const showsEntry = isOpen && target?.kind === 'entry';
	const showsSlot = isOpen && target?.kind === 'slot';
	return (
		<DropdownMenu open={isOpen} onOpenChange={onOpenChange} onOpenChangeComplete={handleOpenChangeComplete}>
			<DropdownMenuContent
				anchor={target?.anchor}
				align="start"
				sideOffset={4}
				collisionPadding={12}
				className="w-56"
			>
				{showsEntry && <EntryItems entry={target.entry} formatters={formatters} actions={actions} />}
				{showsSlot && <SlotItems start={target.start} formatters={formatters} actions={actions} />}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

/**
 * The menu's Stop: the timer's hooks mount only for the stop, which runs once and says when it is over. The stop
 * reports its own failure, as the timer's button does.
 */
export function CalendarTimerStop({ onDone }: Readonly<{ onDone: () => void }>) {
	const { stopTimer } = useTimerActions();
	const hasRunRef = useRef(false);
	useEffect(() => {
		if (hasRunRef.current) {
			return;
		}
		hasRunRef.current = true;
		Promise.resolve(stopTimer())
			.catch(() => undefined)
			.finally(onDone);
	}, [onDone, stopTimer]);
	return null;
}
