'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { TimesheetEntryGroup } from '@/core/lib/utils/dashboards/timesheet-entry-groups';
import { statusOfLog } from '@/core/lib/utils/dashboards/timesheets';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { TimesheetActionSource } from './use-timesheet-dialogs';

export type TimesheetGroupChange =
	| { kind: 'billable'; group: TimesheetEntryGroup; isBillable: boolean }
	| { kind: 'status'; group: TimesheetEntryGroup; status: ETimesheetStatus };

/** What the menu of a group row of similar entries does to every entry of the group. */
export interface TimesheetGroupHandlers {
	setBillable: (group: TimesheetEntryGroup, isBillable: boolean) => void;
	changeStatus: (group: TimesheetEntryGroup, status: ETimesheetStatus) => void;
	remove: (group: TimesheetEntryGroup) => void;
}

interface TimesheetGroupActions {
	setBillableOf: (logs: ReadonlyArray<ITimeLog>, isBillable: boolean) => Promise<number>;
	changeStatus: (logs: ReadonlyArray<ITimeLog>, status: ETimesheetStatus, announces: boolean) => Promise<boolean>;
	openReject: (logs: ReadonlyArray<ITimeLog>, source: TimesheetActionSource) => void;
	openDelete: (logs: ReadonlyArray<ITimeLog>, source: TimesheetActionSource) => void;
}

function announceBillableChange(changedCount: number, count: number, t: ReturnType<typeof useTranslations>) {
	const isAllChanged = changedCount === count;
	if (isAllChanged) {
		toast.success(t('dashboard.timesheets.SIMILAR.CHANGED', { count }));
		return;
	}
	const message = t('dashboard.timesheets.SIMILAR.PARTLY_CHANGED', { changed: changedCount, count });
	const isNoneChanged = changedCount === 0;
	if (isNoneChanged) {
		toast.error(message);
		return;
	}
	toast.warning(message);
}

/**
 * The menu of a group row acts on every entry of the group, with the rules of each entry's own menu: a delete and a
 * reject open the page's dialogs (the reject asks for the reason), a change of billable state or of status waits for
 * the group's confirmation, which says how many entries change. Asking for the state the group already has does
 * nothing.
 */
export function useTimesheetGroupChange(actions: TimesheetGroupActions) {
	const t = useTranslations();
	const [change, setChange] = useState<TimesheetGroupChange | null>(null);
	const [isOpen, setIsOpen] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const { setBillableOf, changeStatus, openReject, openDelete } = actions;

	const handlers = useMemo<TimesheetGroupHandlers>(
		() => ({
			setBillable: (group, isBillable) => {
				const isAlreadySo = Boolean(group.logs[0]?.isBillable) === isBillable;
				if (isAlreadySo) {
					return;
				}
				setChange({ kind: 'billable', group, isBillable });
				setIsOpen(true);
			},
			changeStatus: (group, status) => {
				const isRejection = status === ETimesheetStatus.DENIED;
				if (isRejection) {
					openReject(group.logs, 'group');
					return;
				}
				const isAlreadySo = statusOfLog(group.logs[0]) === status;
				if (isAlreadySo) {
					return;
				}
				setChange({ kind: 'status', group, status });
				setIsOpen(true);
			},
			remove: (group) => openDelete(group.logs, 'group')
		}),
		[openDelete, openReject]
	);

	// Dismissed while its entries are written, the end of that save would close the next confirmation opened.
	const close = useCallback(() => {
		if (isSaving) {
			return;
		}
		setIsOpen(false);
	}, [isSaving]);

	const confirm = useCallback(async () => {
		if (!change) {
			return;
		}
		setIsSaving(true);
		let isDone = true;
		try {
			const { logs } = change.group;
			if (change.kind === 'billable') {
				const changedCount = await setBillableOf(logs, change.isBillable);
				announceBillableChange(changedCount, logs.length, t);
				return;
			}
			// A failed change has already said so; the confirmation stays open to try again or cancel.
			isDone = await changeStatus(logs, change.status, true);
		} finally {
			setIsSaving(false);
			if (isDone) {
				setIsOpen(false);
			}
		}
	}, [change, changeStatus, setBillableOf, t]);

	return { handlers, change, isOpen, isSaving, confirm, close };
}

export type TimesheetGroupChangeState = ReturnType<typeof useTimesheetGroupChange>;
