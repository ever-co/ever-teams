'use client';

import { useCallback, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { activeTeamIdState, activeTeamState, organizationTeamsState } from '@/core/stores';
import { getActiveTeamIdCookie } from '@/core/lib/helpers/cookies';
import { ERoleName } from '@/core/types/generics/enums/role';
import { TOrganizationTeam, TOrganizationTeamEmployee, TUser } from '@/core/types/schemas';
import { useUserQuery } from '../queries/user-user.query';
import { useMyRolePermissionsQuery } from '../roles/use-my-role-permissions-query';

/** The permission the API states on every write of a task status, priority, size, version or issue type. */
const TASK_SETTING_PERMISSION = 'ORG_TASK_SETTING';

/** A task status, priority, size, version or issue type, as far as the team it belongs to goes. */
type TTaskSettingRow = { organizationTeamId?: string | null };

/** A row as the lists hand it over, which null-check their items: a missing one counts as a row of no team. */
type TListedTaskSettingRow = TTaskSettingRow | null | undefined;

/** Whether a team membership is the user's own: the API reads the caller's memberships by their employee. */
function isOwnMembership(member: TOrganizationTeamEmployee, user: TUser): boolean {
	const employeeId = user.employee?.id ?? user.employeeId;
	const isOwnEmployee = !!employeeId && member.employeeId === employeeId;
	const isOwnUser = member.employee?.userId === user.id;
	return isOwnEmployee || isOwnUser;
}

/**
 * Whether a membership makes its employee a manager of the team, as the API decides it for these writes: flagged
 * `isManager` or holding the MANAGER role, on a membership still in effect (`null` counts as active and not archived).
 */
function isManagerMembership(member: TOrganizationTeamEmployee): boolean {
	const isInEffect = member.isActive !== false;
	const isNotArchived = member.isArchived !== true;
	const isFlaggedManager = member.isManager === true;
	const hasManagerRole = member.role?.name === ERoleName.MANAGER;
	const managesTeam = isFlaggedManager || hasManagerRole;
	return isInEffect && isNotArchived && managesTeam;
}

/** The ids of the loaded teams the user manages. */
function teamsManagedBy(teams: TOrganizationTeam[], user: TUser | undefined): Set<string> {
	const managed = new Set<string>();
	if (!user) {
		return managed;
	}

	for (const team of teams) {
		const members = team.members ?? [];
		const ownMemberships = members.filter((member) => isOwnMembership(member, user));
		const isManaged = ownMemberships.some(isManagerMembership);
		if (isManaged) {
			managed.add(team.id);
		}
	}

	return managed;
}

function isManagedTeam(teamId: string | null | undefined, managedTeamIds: Set<string>): boolean {
	if (!teamId) {
		return false;
	}
	return managedTeamIds.has(teamId);
}

/** Whether every team a write touches is one the user manages. A row of no team never is. */
function writesOnlyInManagedTeams(teamIds: Array<string | null | undefined>, managedTeamIds: Set<string>): boolean {
	if (!teamIds.length) {
		return false;
	}
	return teamIds.every((teamId) => isManagedTeam(teamId, managedTeamIds));
}

/** The team new rows are filed under, resolved as the create hooks resolve it. */
function teamOfNewRows(activeTeam: TOrganizationTeam | null, activeTeamId: string | null): string | null | undefined {
	if (activeTeam?.id) {
		return activeTeam.id;
	}
	const cookieTeamId = getActiveTeamIdCookie();
	return cookieTeamId || activeTeamId;
}

/**
 * Who may change the task settings (statuses, priorities, sizes, versions and issue types), by the rule the API
 * enforces on those writes: a holder of ORG_TASK_SETTING changes every row; anyone else only the rows of a team they
 * manage. A row of no team, such as a system default, needs the permission.
 *
 * Until the role's permissions, the user and the active team are loaded, nothing is shown read-only: the API still
 * decides every write.
 *
 * @returns `canCreate` for a new row of the active team, `canWriteRow` and `canWriteRows` for stored rows, and the hint
 * a read-only control shows.
 */
export function useTaskSettingsAccess() {
	const t = useTranslations();
	const { myPermissions, isSuccess: permissionsLoaded } = useMyRolePermissionsQuery();
	const { data: user } = useUserQuery();
	const teams = useAtomValue(organizationTeamsState);
	const activeTeam = useAtomValue(activeTeamState);
	const activeTeamId = useAtomValue(activeTeamIdState);

	const holdsPermission = myPermissions.includes(TASK_SETTING_PERMISSION);
	const membershipsLoaded = !!user && !!activeTeam;
	const isDecided = permissionsLoaded && membershipsLoaded;
	const writesEveryRow = holdsPermission || !isDecided;

	const managedTeamIds = useMemo(() => teamsManagedBy(teams, user), [teams, user]);

	const canWriteInTeams = useCallback(
		(teamIds: Array<string | null | undefined>) => {
			if (writesEveryRow) {
				return true;
			}
			return writesOnlyInManagedTeams(teamIds, managedTeamIds);
		},
		[writesEveryRow, managedTeamIds]
	);

	const canWriteRow = useCallback(
		(row: TListedTaskSettingRow) => canWriteInTeams([row?.organizationTeamId]),
		[canWriteInTeams]
	);

	const canWriteRows = useCallback(
		(rows: TListedTaskSettingRow[]) => {
			const teamIds = rows.map((row) => row?.organizationTeamId);
			return canWriteInTeams(teamIds);
		},
		[canWriteInTeams]
	);

	const newRowsTeamId = teamOfNewRows(activeTeam, activeTeamId);
	const canCreate = canWriteInTeams([newRowsTeamId]);
	const readOnlyHint = t('pages.settingsTeam.TASK_SETTINGS_READ_ONLY');

	return {
		canCreate,
		canWriteRow,
		canWriteRows,
		readOnlyHint
	};
}
