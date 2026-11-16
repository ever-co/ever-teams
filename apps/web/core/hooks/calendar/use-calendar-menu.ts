'use client';

import { useCallback, useMemo, useState } from 'react';
import { useStore } from 'jotai';
import { useQueryClient } from '@tanstack/react-query';
import type { CalendarMenuActions, CalendarMenuTarget } from '@/core/components/calendar/calendar-context-menu';
import type { EntryHandlers } from '@/core/components/calendar/calendar-entry-parts';
import { useAddTimeAccess } from '@/core/hooks/dashboards/timesheets/use-add-time-access';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useTimeEntryDuplicate } from '@/core/hooks/timesheet/use-time-entry-duplicate';
import { type SplitRefusal, splitRefusalOf } from '@/core/lib/utils/calendar-split';
import type { CalendarEntry } from '@/core/lib/utils/calendar-view';
import { memberIdOfLog } from '@/core/lib/utils/dashboards/timesheets';
import { ADD_TIME_ENTRY_STEP_MINUTES, canDuplicateLog } from '@/core/lib/utils/time-entry-reuse';
import { queryKeys } from '@/core/query/keys';
import { activeTeamState, tasksByTeamState } from '@/core/stores';
import type { CalendarEntryMoves } from './use-calendar-entry-moves';
import type { CalendarPageState } from './use-calendar-page';
import { useTimeLogSplitSupport } from './use-time-log-split-support';

interface CalendarMenuOptions {
	page: CalendarPageState;
	handlers: EntryHandlers;
	moves: CalendarEntryMoves;
	onAddTime: (start: Date) => void;
}

/**
 * The menu of the Calendar's grids and what its items open: the Timesheets dialogs for Edit, Delete and Duplicate,
 * with the same rules as the entry's card and the Timesheets row, the split dialog, and a stop of the viewer's own
 * running timer. One menu for the whole page, like the task list's.
 */
export function useCalendarMenu({ page, handlers, moves, onAddTime }: CalendarMenuOptions) {
	const store = useStore();
	const queryClient = useQueryClient();
	const { data: user } = useUserQuery();
	const { canAddTime, fixedMember: addTimeMember } = useAddTimeAccess(page.permissions, user);
	const duplicate = useTimeEntryDuplicate({ stepMinutes: ADD_TIME_ENTRY_STEP_MINUTES });
	const openDuplicate = duplicate.open;
	const [target, setTarget] = useState<CalendarMenuTarget | null>(null);
	const [isOpen, setIsOpen] = useState(false);
	const [splitEntry, setSplitEntry] = useState<CalendarEntry | null>(null);
	const [isSplitOpen, setIsSplitOpen] = useState(false);
	const [isStopAsked, setIsStopAsked] = useState(false);
	const { ownEmployeeId } = page;
	const { canEdit, onEdit, onDelete } = handlers;

	const open = useCallback((next: CalendarMenuTarget) => {
		setTarget(next);
		setIsOpen(true);
	}, []);

	const clearTarget = useCallback(() => setTarget(null), []);

	const actions = useMemo<CalendarMenuActions>(
		() => ({
			canEdit: (entry) => canEdit(entry.log),
			// Duplicate opens the Add time entry dialog: offered to whoever it offers Add time, on an entry whose task
			// and member it offers (the active team's), read when the menu opens
			canDuplicate: (entry) => {
				const members = store.get(activeTeamState)?.members ?? [];
				const targets = { tasks: store.get(tasksByTeamState), members };
				return canDuplicateLog(entry.log, canAddTime, addTimeMember?.employeeId ?? null, targets);
			},
			canStop: (entry) => {
				const isOwnEntry = Boolean(ownEmployeeId) && memberIdOfLog(entry.log) === ownEmployeeId;
				return entry.isRunning && isOwnEntry;
			},
			onEdit: (entry) => onEdit(entry.log),
			onDuplicate: (entry) => {
				void openDuplicate({ log: entry.log });
			},
			onSplit: (entry) => {
				setSplitEntry(entry);
				setIsSplitOpen(true);
			},
			onDelete: (entry) => onDelete(entry.log),
			onStop: () => setIsStopAsked(true),
			onAddTime
		}),
		[addTimeMember, canAddTime, canEdit, onAddTime, onDelete, onEdit, openDuplicate, ownEmployeeId, store]
	);

	// Whether the API splits in one write, its slots included (ever-co/ever-gauzy#12030): asked once, when the dialog
	// first opens on an entry that is not running
	const isStoppedEntry = splitEntry !== null && !splitEntry.isRunning;
	const splitSupport = useTimeLogSplitSupport(splitEntry?.log ?? null, isSplitOpen && isStoppedEntry);
	const splitsThroughApi = splitSupport === 'supported';

	let splitRefusal: SplitRefusal = 'none';
	if (splitEntry) {
		const window = { start: splitEntry.start, end: splitEntry.end };
		// The API's split is an edit of the entry: the rest is the same time, not time added by hand
		let mayChangeTime = moves.allowsTimeChanges && canAddTime;
		if (splitsThroughApi) {
			mayChangeTime = moves.allowsTimeChanges;
		}
		const rules = {
			isOnApprovedDay: moves.isOnApprovedDay(splitEntry),
			mayChangeTime,
			canSplitTracked: splitsThroughApi
		};
		splitRefusal = splitRefusalOf(splitEntry.log, window, rules);
	}
	// The dialog waits for that answer, once per session, before it says whether the entry can be split and how
	const isCheckingSplit = isStoppedEntry && splitSupport === 'checking';

	const closeSplit = useCallback(() => setIsSplitOpen(false), []);

	// The running entry is read again once stopped, so the grid draws where it ended
	const finishStop = useCallback(() => {
		setIsStopAsked(false);
		void queryClient.invalidateQueries({ queryKey: queryKeys.timeLogs.all });
		void queryClient.invalidateQueries({ queryKey: queryKeys.timesheet.all });
	}, [queryClient]);

	return {
		menu: { target, isOpen, open, setIsOpen, clearTarget },
		actions,
		split: {
			entry: splitEntry,
			isOpen: isSplitOpen,
			refusal: splitRefusal,
			isChecking: isCheckingSplit,
			viaApi: splitsThroughApi,
			close: closeSplit
		},
		stop: { isAsked: isStopAsked, finish: finishStop },
		duplicate,
		addTimeMember
	};
}
