'use client';

import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useLocale } from 'next-intl';
import {
	type SheetEditing,
	type SheetEditingSource,
	useSheetEditing
} from '@/core/hooks/dashboards/timesheets/use-sheet-editing';
import { useSheetEmptyMembers } from '@/core/hooks/dashboards/timesheets/use-sheet-empty-members';
import { useTimesheetDialogs } from '@/core/hooks/dashboards/timesheets/use-timesheet-dialogs';
import { useTimesheetLogActions } from '@/core/hooks/dashboards/timesheets/use-timesheet-log-actions';
import { type TimesheetSheetState, useTimesheetSheet } from '@/core/hooks/dashboards/timesheets/use-timesheet-sheet';
import type { TimesheetPermissions } from '@/core/hooks/dashboards/timesheets/use-timesheets-page';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';
import { timesheetFormattersOf } from '@/core/lib/utils/dashboards/timesheets';
import { queryKeys } from '@/core/query/keys';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

const DELETE_TIME_PERMISSION = 'ALLOW_DELETE_TIME';

const NO_PICKED_MEMBERS: string[] = [];

function isOpenCellEditable(sheet: TimesheetSheetState, cellLockFor: SheetEditing['cellLockFor']) {
	const target = sheet.openCell;
	if (!target) {
		return false;
	}
	const day = sheet.days.find((candidate) => candidate.key === target.dayKey);
	if (!day) {
		return false;
	}
	const row = sheet.sheet.rows.find((candidate) => candidate.key === target.rowKey);
	const cell = row?.cells.get(target.dayKey);
	const lock = cellLockFor(day, cell);
	return lock === 'none';
}

/**
 * The week sheet of the Work diary: the sheet of Timesheets for the signed-in member alone, under the same editing
 * rules. The manager tools stay in Timesheets: no other member is offered, nothing is approved or rejected, and an
 * entry is not edited here, because its dialog can hand the entry to another member. An entry is deleted only where
 * time can be typed and the role and the organization allow deleting time: a read-only sheet, an approved day and a
 * cell whose timer runs stay as they are.
 */
export function useWorkDiaryWeekSheet(source: SheetEditingSource) {
	const locale = useLocale();
	const queryClient = useQueryClient();
	const { data: user } = useUserQuery();
	const organization = useAtomValue(currentOrganizationState);
	const { myPermissions } = useMyRolePermissionsQuery();
	const emptyMembers = useSheetEmptyMembers({
		user,
		activeTeam: null,
		pickedMemberIds: NO_PICKED_MEMBERS,
		isManage: false
	});
	const sheet = useTimesheetSheet(source.periodLogs, source.period, emptyMembers);
	const editing = useSheetEditing(source, sheet);
	const dialogs = useTimesheetDialogs();
	const { deleteLogs, isDeleting } = useTimesheetLogActions();
	const formatters = useMemo(() => timesheetFormattersOf(locale), [locale]);

	const userId = user?.id ?? null;
	const ownEmployeeId = source.ownEmployeeId;
	const permissions = useMemo<TimesheetPermissions>(
		() => ({ hasOrganizationRole: false, isManage: false, canApprove: false, userId, employeeId: ownEmployeeId }),
		[ownEmployeeId, userId]
	);

	const mayDeleteTime = myPermissions.includes(DELETE_TIME_PERMISSION);
	const allowsDeleteTime = organization?.allowDeleteTime !== false;
	const isDeletionAllowed = mayDeleteTime && allowsDeleteTime;
	const canDeleteOpenEntries = isDeletionAllowed && isOpenCellEditable(sheet, editing.cellLockFor);
	const { openDelete, deleteTarget } = dialogs;

	const askToDeleteEntry = useCallback((log: ITimeLog) => openDelete([log], 'row'), [openDelete]);

	const confirmDelete = useCallback(async () => {
		const isDeleted = await deleteLogs(deleteTarget.logIds, true);
		if (isDeleted) {
			// The day view's screenshots are the slots of the logs: those of a deleted log are gone with it
			void queryClient.invalidateQueries({ queryKey: queryKeys.timer.timeSlots.all });
		}
	}, [deleteLogs, deleteTarget.logIds, queryClient]);

	return {
		sheet,
		editing,
		formatters,
		permissions,
		canDeleteOpenEntries,
		askToDeleteEntry,
		dialogs,
		isDeleting,
		confirmDelete
	};
}

export type WorkDiaryWeekSheetState = ReturnType<typeof useWorkDiaryWeekSheet>;
