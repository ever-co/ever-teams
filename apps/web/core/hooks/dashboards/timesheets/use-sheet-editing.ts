'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import {
	approvedDayKeysOf,
	type CellLock,
	cellLockOf,
	dayDateOfKey,
	rowIdentityOfTask,
	type SheetEditRules,
	sheetLockOf
} from '@/core/lib/utils/dashboards/timesheet-sheet-edit';
import {
	ALL_STATUSES,
	memberIdOfLog,
	type SheetCell,
	type SheetDay,
	type SheetRowIdentity,
	sheetRowKeyFor
} from '@/core/lib/utils/dashboards/timesheets';
import { activeTeamState } from '@/core/stores/teams/organization-team';
import { tasksByTeamState } from '@/core/stores/teams/team-tasks';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { useCopyPreviousWeek } from './use-copy-previous-week';
import { useSheetCellWrites } from './use-sheet-cell-writes';
import { useSheetDraftRows } from './use-sheet-draft-rows';
import type { TimesheetSheetState } from './use-timesheet-sheet';
import type { TimesheetsPageState } from './use-timesheets-page';

const MANUAL_TIME_PERMISSION = 'ALLOW_MANUAL_TIME';

const NO_LOGS: ITimeLog[] = [];

function logsOfMember(logs: ReadonlyArray<ITimeLog>, memberId: string | null): ITimeLog[] {
	if (!memberId) {
		return NO_LOGS;
	}
	return logs.filter((log) => memberIdOfLog(log) === memberId);
}

/** A status, search, project or task filter shows only part of a cell's time, so the sheet cannot be edited under it. */
function isNarrowed(page: TimesheetsPageState) {
	const hasStatus = page.statusFilter !== ALL_STATUSES;
	const hasSearch = page.search.trim().length > 0;
	const hasProjects = page.filters.projects.length > 0;
	const hasTasks = page.filters.tasks.length > 0;
	return hasStatus || hasSearch || hasProjects || hasTasks;
}

/**
 * A row added by hand stays shown until time lands on it. The API may file that time under another project than the
 * row named (the team's default one, for a task without a project), so a logged row of the same task counts too.
 */
function isDraftStillEmpty(
	identity: SheetRowIdentity,
	shownRowKeys: ReadonlySet<string>,
	loggedTaskIds: ReadonlySet<string | null>
) {
	if (shownRowKeys.has(identity.key)) {
		return false;
	}
	if (!identity.taskId) {
		return true;
	}
	return !loggedTaskIds.has(identity.taskId);
}

function sheetKeyOf(memberId: string | null, page: TimesheetsPageState) {
	if (!memberId) {
		return null;
	}
	const fromKey = localDayKeyOf(page.period.from);
	const toKey = localDayKeyOf(page.period.to);
	return `${memberId}:${fromKey}:${toKey}`;
}

export function useSheetEditing(page: TimesheetsPageState, sheet: TimesheetSheetState) {
	const organization = useAtomValue(currentOrganizationState);
	const activeTeam = useAtomValue(activeTeamState);
	const teamTasks = useAtomValue(tasksByTeamState);
	const { organizationProjects } = useOrganizationProjectsQuery();
	const { myPermissions, isLoading: isLoadingPermissions } = useMyRolePermissionsQuery();
	const { permissions, logsQuery, user } = page;

	const memberId = sheet.member?.id ?? null;
	const isOwnSheet = Boolean(memberId) && memberId === permissions.employeeId;
	const hasManualTimePermission = myPermissions.includes(MANUAL_TIME_PERMISSION);
	const mayWriteForMember = isOwnSheet || permissions.hasOrganizationRole;
	const canWrite = hasManualTimePermission && mayWriteForMember;
	const allowsManualTime = organization?.allowManualTime !== false;
	const allowsFutureDates = organization?.futureDateAllowed === true;
	const hasData = Boolean(logsQuery.data);
	const isShowingOtherPeriod = logsQuery.isPlaceholderData;
	const isLoading = !hasData || isShowingOtherPeriod || isLoadingPermissions;
	const isFiltered = isNarrowed(page);

	const memberLogs = useMemo(() => logsOfMember(page.allLogs, memberId), [memberId, page.allLogs]);
	const approvedDayKeys = useMemo(() => approvedDayKeysOf(memberLogs), [memberLogs]);
	const todayKey = localDayKeyOf(new Date());

	const rules = useMemo<SheetEditRules>(
		() => ({
			isLoading,
			isFiltered,
			canWrite,
			allowsManualTime,
			allowsFutureDates,
			approvedDayKeys,
			now: dayDateOfKey(todayKey)
		}),
		[allowsFutureDates, allowsManualTime, approvedDayKeys, canWrite, isFiltered, isLoading, todayKey]
	);
	const sheetLock = sheetLockOf(rules);

	const cellLockFor = useCallback(
		(day: SheetDay, cell: SheetCell | undefined): CellLock => cellLockOf(rules, day, cell),
		[rules]
	);

	const dayLockOf = useCallback((day: SheetDay): CellLock => cellLockOf(rules, day, undefined), [rules]);

	const memberLogsRef = useRef<ReadonlyArray<ITimeLog>>(memberLogs);
	useEffect(() => {
		memberLogsRef.current = memberLogs;
	}, [memberLogs]);

	const readMemberLogs = useCallback(() => memberLogsRef.current, []);
	const { refetch } = logsQuery;
	const refreshMemberLogs = useCallback(async () => {
		const result = await refetch();
		const logs = result.data ?? NO_LOGS;
		const fresh = logsOfMember(logs, memberId);
		memberLogsRef.current = fresh;
		return fresh;
	}, [memberId, refetch]);

	const teamId = activeTeam?.id ?? null;
	const writes = useSheetCellWrites({
		memberId,
		defaultTeamId: teamId,
		allowsFutureDates,
		readMemberLogs,
		refreshMemberLogs
	});
	const sheetKey = sheetKeyOf(memberId, page);
	const { rows: storedDraftRows, addRows, removeRow } = useSheetDraftRows(sheetKey);

	const shownRowKeys = useMemo(() => {
		const keys = sheet.sheet.rows.map((row) => row.key);
		return new Set(keys);
	}, [sheet.sheet.rows]);
	const loggedTaskIds = useMemo(() => {
		const taskIds = sheet.sheet.rows.map((row) => row.identity.taskId);
		return new Set(taskIds);
	}, [sheet.sheet.rows]);
	const draftRows = useMemo(
		() => storedDraftRows.filter((identity) => isDraftStillEmpty(identity, shownRowKeys, loggedTaskIds)),
		[loggedTaskIds, shownRowKeys, storedDraftRows]
	);

	const addTaskRow = useCallback(
		(task: TTask) => {
			const projects = organizationProjects ?? [];
			const project = projects.find((candidate) => candidate.id === task.projectId);
			const identity = rowIdentityOfTask(task, project, teamId);
			addRows([identity]);
		},
		[addRows, organizationProjects, teamId]
	);

	const isTaskShown = useCallback(
		(task: TTask) => {
			const projectId = task.projectId ?? null;
			const rowKey = sheetRowKeyFor(projectId, task.id);
			const isLogged = loggedTaskIds.has(task.id);
			const isDraft = draftRows.some((row) => row.key === rowKey);
			return isLogged || isDraft;
		},
		[draftRows, loggedTaskIds]
	);

	const logsScope = useMemo(
		() => ({
			tenantId: user?.tenantId,
			organizationId: user?.employee?.organizationId,
			userTimeZone: user?.timeZone
		}),
		[user?.employee?.organizationId, user?.tenantId, user?.timeZone]
	);

	const copyWeek = useCopyPreviousWeek({
		period: page.period,
		logsScope,
		memberId,
		days: sheet.days,
		rows: sheet.sheet.rows,
		dayLockOf,
		addRows,
		writes
	});

	return {
		sheetLock,
		cellLockFor,
		writes,
		draftRows,
		removeDraftRow: removeRow,
		teamTasks,
		addTaskRow,
		isTaskShown,
		copyWeek
	};
}

export type SheetEditing = ReturnType<typeof useSheetEditing>;
