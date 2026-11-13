'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import type { Period } from '@/core/lib/utils/dashboard-period';
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
	logsOfMember,
	type SheetCell,
	type SheetDay,
	type SheetRowIdentity,
	sheetRowKeyFor
} from '@/core/lib/utils/dashboards/timesheets';
import { activeTeamState } from '@/core/stores/teams/organization-team';
import { tasksByTeamState } from '@/core/stores/teams/team-tasks';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { TOrganizationProject } from '@/core/types/schemas/organization/organization-project.schema';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { useCopyPreviousWeek } from './use-copy-previous-week';
import { useSheetCellWrites } from './use-sheet-cell-writes';
import { useSheetDraftRows } from './use-sheet-draft-rows';
import { timesheetPageLogsRequestOf } from './use-timesheet-page-logs';
import type { TimesheetSheetState } from './use-timesheet-sheet';

const MANUAL_TIME_PERMISSION = 'ALLOW_MANUAL_TIME';
const DELETE_TIME_PERMISSION = 'ALLOW_DELETE_TIME';
const MODIFY_TIME_PERMISSION = 'ALLOW_MODIFY_TIME';

const NO_LOGS: ITimeLog[] = [];

/** What the sheet's editing reads from the page that shows it: who is looking, the period on screen and its logs. */
export interface SheetEditingSource {
	/** The viewer's own employee id: the sheet of that member is the viewer's own. */
	ownEmployeeId: string | null;
	/** Organisation roles write on any member's sheet; everyone else on their own only. */
	hasOrganizationRole: boolean;
	period: Period;
	/** The logs of the period as the page read them, every filter aside. */
	periodLogs: ReadonlyArray<ITimeLog>;
	/** False until the logs of this very period are read: on the first load, and while another period's stay shown. */
	hasPeriodLogs: boolean;
	/** A filter that shows only part of a cell's time: the sheet cannot be edited under it. */
	isFiltered: boolean;
	tenantId: string | null | undefined;
	organizationId: string | null | undefined;
	/** The zone the page reads its logs in, as `timesheetPageLogsRequestOf` takes it. */
	userTimeZone: string | null | undefined;
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

/**
 * A row added before the organization's projects were read has its project's id but neither its name nor whether its
 * time is billable: both are taken from the project once it is read, so the time typed in the row is billed as the
 * project says.
 */
function withProjectOf(identity: SheetRowIdentity, projects: ReadonlyArray<TOrganizationProject>): SheetRowIdentity {
	const hasProjectData = identity.projectName !== null;
	if (!identity.projectId || hasProjectData) {
		return identity;
	}
	const project = projects.find((candidate) => candidate.id === identity.projectId);
	if (!project) {
		return identity;
	}
	return {
		...identity,
		projectName: project.name,
		projectColor: project.color ?? null,
		projectImageUrl: project.imageUrl ?? null,
		isBillable: project.billable === true
	};
}

function sheetKeyOf(memberId: string | null, period: Period) {
	if (!memberId) {
		return null;
	}
	const fromKey = localDayKeyOf(period.from);
	const toKey = localDayKeyOf(period.to);
	return `${memberId}:${fromKey}:${toKey}`;
}

export function useSheetEditing(source: SheetEditingSource, sheet: TimesheetSheetState) {
	const queryClient = useQueryClient();
	const organization = useAtomValue(currentOrganizationState);
	const activeTeam = useAtomValue(activeTeamState);
	const teamTasks = useAtomValue(tasksByTeamState);
	const { organizationProjects } = useOrganizationProjectsQuery();
	const { myPermissions, isLoading: isLoadingPermissions } = useMyRolePermissionsQuery();
	const { ownEmployeeId, hasOrganizationRole, period, periodLogs, hasPeriodLogs, isFiltered } = source;
	const { tenantId, organizationId, userTimeZone } = source;

	const memberId = sheet.member?.id ?? null;
	const isOwnSheet = Boolean(memberId) && memberId === ownEmployeeId;
	const hasManualTimePermission = myPermissions.includes(MANUAL_TIME_PERMISSION);
	const mayWriteForMember = isOwnSheet || hasOrganizationRole;
	const canWrite = hasManualTimePermission && mayWriteForMember;
	const lacksOnlyManualTimePermission = mayWriteForMember && !hasManualTimePermission;
	const allowsManualTime = organization?.allowManualTime !== false;
	const allowsFutureDates = organization?.futureDateAllowed === true;
	// A lower cell deletes or shortens manual entries: the API asks for each right, of the role and the organization
	const mayDeleteTime = myPermissions.includes(DELETE_TIME_PERMISSION) && organization?.allowDeleteTime !== false;
	const mayModifyTime = myPermissions.includes(MODIFY_TIME_PERMISSION) && organization?.allowModifyTime !== false;
	const isLoading = !hasPeriodLogs || isLoadingPermissions;

	const memberLogs = useMemo(() => logsOfMember(periodLogs, memberId), [memberId, periodLogs]);
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

	const logsScope = useMemo(
		() => ({ tenantId, organizationId, userTimeZone }),
		[organizationId, tenantId, userTimeZone]
	);

	/**
	 * Asks the API for this member's logs of this period, under its own request: a write queued here still reads
	 * its own member and week after the page moved to another one, and a failed read rejects instead of answering
	 * what was shown before.
	 */
	const readSavedMemberLogs = useCallback(async (): Promise<ReadonlyArray<ITimeLog>> => {
		if (!memberId) {
			return NO_LOGS;
		}
		// New time is placed on the browser's days: the read covers those days in the browser's zone, whatever zone
		// the profile names, so a saved entry at either end of the week is never missed (a write over it would make
		// the API remove it unseen)
		const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		const request = timesheetPageLogsRequestOf(period, {
			...logsScope,
			userTimeZone: browserTimeZone,
			employeeIds: [memberId]
		});
		const logs = await queryClient.fetchQuery({
			queryKey: request.queryKey,
			queryFn: request.queryFn,
			staleTime: 0
		});
		return logsOfMember(logs, memberId);
	}, [logsScope, memberId, period, queryClient]);

	const teamId = activeTeam?.id ?? null;
	const writes = useSheetCellWrites({
		memberId,
		defaultTeamId: teamId,
		allowsFutureDates,
		mayDeleteTime,
		mayModifyTime,
		readMemberLogs,
		readSavedMemberLogs
	});
	const sheetKey = sheetKeyOf(memberId, period);
	const { rows: storedDraftRows, addRows, removeRow } = useSheetDraftRows(sheetKey);

	const shownRowKeys = useMemo(() => {
		const keys = sheet.sheet.rows.map((row) => row.key);
		return new Set(keys);
	}, [sheet.sheet.rows]);
	const loggedTaskIds = useMemo(() => {
		const taskIds = sheet.sheet.rows.map((row) => row.identity.taskId);
		return new Set(taskIds);
	}, [sheet.sheet.rows]);
	const draftRows = useMemo(() => {
		const emptyRows = storedDraftRows.filter((identity) => isDraftStillEmpty(identity, shownRowKeys, loggedTaskIds));
		return emptyRows.map((identity) => withProjectOf(identity, organizationProjects));
	}, [loggedTaskIds, organizationProjects, shownRowKeys, storedDraftRows]);

	const addTaskRow = useCallback(
		(task: TTask) => {
			const project = organizationProjects.find((candidate) => candidate.id === task.projectId);
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

	const copyWeek = useCopyPreviousWeek({
		sheetKey,
		period,
		logsScope,
		memberId,
		days: sheet.days,
		rows: sheet.sheet.rows,
		draftRows: storedDraftRows,
		dayLockOf,
		addRows,
		writes
	});

	return {
		sheetLock,
		lacksOnlyManualTimePermission,
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
