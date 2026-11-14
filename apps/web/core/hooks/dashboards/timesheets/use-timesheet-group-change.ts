'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
	bulkEditPlanOf,
	bulkEditResultOf,
	type BulkEditPlan
} from '@/core/lib/utils/dashboards/timesheet-bulk-edit';
import type { TimesheetEntryGroup } from '@/core/lib/utils/dashboards/timesheet-entry-groups';
import { statusOfLog } from '@/core/lib/utils/dashboards/timesheets';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { useBulkEditRun } from './use-bulk-edit-run';
import type { TimesheetActionSource } from './use-timesheet-dialogs';
import { canEditLog, type TimesheetPermissions } from './use-timesheets-page';

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
	/** Whose entries the reader may change: the billable change leaves out the others. */
	permissions: TimesheetPermissions;
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
 * The billable change of a group, planned as the page's bulk edit plans one: entries the reader may not change,
 * running or approved ones are left out, and an entry already in that state has nothing to save.
 */
function groupBillablePlanOf(
	group: TimesheetEntryGroup,
	isBillable: boolean,
	permissions: TimesheetPermissions
): BulkEditPlan {
	return bulkEditPlanOf(
		group.logs,
		{ projectId: null, task: null, isBillable },
		{ listedTeamId: null, canEdit: (log) => canEditLog(log, permissions) }
	);
}

/**
 * The menu of a group row acts on every entry of the group, with the rules of each entry's own menu: a delete and a
 * reject open the page's dialogs (the reject asks for the reason), a change of billable state or of status waits for
 * the group's confirmation, which says how many entries change. Asking for the state the group already has does
 * nothing. The billable change runs as the page's bulk edit does (useBulkEditRun): each entry is read again before
 * it is written, and one whose interval now overlaps another entry is not saved.
 */
export function useTimesheetGroupChange(actions: TimesheetGroupActions) {
	const t = useTranslations();
	const [change, setChange] = useState<TimesheetGroupChange | null>(null);
	const [isOpen, setIsOpen] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const { permissions, changeStatus, openReject, openDelete } = actions;
	const { run } = useBulkEditRun();

	const handlers = useMemo<TimesheetGroupHandlers>(
		() => ({
			setBillable: (group, isBillable) => {
				const hasNothingToSave = groupBillablePlanOf(group, isBillable, permissions).saves.length === 0;
				if (hasNothingToSave) {
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
		[openDelete, openReject, permissions]
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
				const plan = groupBillablePlanOf(change.group, change.isBillable, permissions);
				const outcomes = await run(plan.saves);
				// Another bulk change still runs: nothing was sent, and the confirmation stays to try again
				if (outcomes === null) {
					isDone = false;
					return;
				}
				const result = bulkEditResultOf(plan, outcomes);
				announceBillableChange(result.updatedCount, result.updatedCount + result.notUpdatedCount, t);
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
	}, [change, changeStatus, permissions, run, t]);

	return { handlers, change, isOpen, isSaving, confirm, close };
}

export type TimesheetGroupChangeState = ReturnType<typeof useTimesheetGroupChange>;
