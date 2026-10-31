import { useCallback, useMemo } from 'react';
import { translate } from '../../../i18n';
import { useStores } from '../../../models';
import useFetchMyRolePermissions from '../../client/queries/user/role-permissions';
import { IOrganizationTeamList, OT_Member } from '../../interfaces/IOrganizationTeam';
import { IRolePermission } from '../../interfaces/IRolePermission';
import { IUser } from '../../interfaces/IUserData';

/** The permission the API states on every write of a task status, priority, size, version or issue type. */
const TASK_SETTING_PERMISSION = 'ORG_TASK_SETTING';

/** The membership role that makes its employee a manager of the team, as the `isManager` flag does. */
const MANAGER_ROLE = 'MANAGER';

/** A task status, priority, size or version, as far as the team it belongs to goes. */
type TTaskSettingRow = { organizationTeamId?: string | null };

/** Whether a permission row grants the task settings: only an enabled one does, as the web reader counts them. */
function grantsTaskSettings(row: IRolePermission): boolean {
	const isEnabled = row.enabled === true;
	const isTaskSetting = row.permission === TASK_SETTING_PERMISSION;
	return isEnabled && isTaskSetting;
}

/** Whether the role's permissions, as the API lists them for the signed-in user, hold the task settings one. */
function holdsTaskSettingPermission(rolePermissions: IRolePermission[] | undefined): boolean {
	const rows = rolePermissions ?? [];
	return rows.some(grantsTaskSettings);
}

/** Whether a team membership is the user's own: the API reads the caller's memberships by their employee. */
function isOwnMembership(member: OT_Member, user: IUser, employeeId: string): boolean {
	const ownEmployeeId = user.employee?.id || employeeId;
	const isOwnEmployee = !!ownEmployeeId && member.employeeId === ownEmployeeId;
	const isOwnUser = member.employee?.userId === user.id;
	return isOwnEmployee || isOwnUser;
}

/**
 * Whether a membership makes its employee a manager of the team, as the API decides it for these writes: flagged
 * `isManager` or holding the MANAGER role, on a membership still in effect (`null` counts as active and not archived).
 */
function isManagerMembership(member: OT_Member): boolean {
	const isInEffect = member.isActive !== false;
	const isNotArchived = member.isArchived !== true;
	const isFlaggedManager = member.isManager === true;
	const hasManagerRole = member.role?.name === MANAGER_ROLE;
	const managesTeam = isFlaggedManager || hasManagerRole;
	return isInEffect && isNotArchived && managesTeam;
}

/** The ids of the loaded teams the user manages. */
function teamsManagedBy(teams: IOrganizationTeamList[], user: IUser | null, employeeId: string): Set<string> {
	const managed = new Set<string>();
	if (!user) {
		return managed;
	}

	for (const team of teams) {
		const members = team.members ?? [];
		const ownMemberships = members.filter((member) => isOwnMembership(member, user, employeeId));
		const isManaged = ownMemberships.some(isManagerMembership);
		if (isManaged) {
			managed.add(team.id);
		}
	}

	return managed;
}

/** Whether a row filed under this team is one the user manages. A row of no team never is. */
function isManagedTeam(teamId: string | null | undefined, managedTeamIds: Set<string>): boolean {
	if (!teamId) {
		return false;
	}
	return managedTeamIds.has(teamId);
}

/**
 * Who may change the task settings (statuses, priorities, sizes and versions), by the rule the API enforces on those
 * writes: a holder of ORG_TASK_SETTING changes every row; anyone else only the rows of a team they manage. A row of no
 * team, such as a system default, needs the permission. A team's creator is its manager through that membership.
 *
 * Until the role's permissions, the user and the active team are loaded, nothing is shown read-only: the API still
 * decides every write. Once read, the permissions keep deciding when a later refresh of them fails.
 *
 * The user and the memberships come from the MobX stores: a component calling this hook is an `observer`, so its
 * controls follow a membership change.
 *
 * @returns `canCreate` for a new row of the active team, `canWriteRow` for a stored row, and the hint a read-only
 * control shows.
 */
export function useTaskSettingsAccess() {
	const {
		authenticationStore: { authToken, tenantId, user, employeeId },
		teamStore: { teams, activeTeam, activeTeamId }
	} = useStores();
	const { data: rolePermissions } = useFetchMyRolePermissions({
		// Signed out the store holds no token: the query stays disabled until it does
		authToken: authToken ?? '',
		tenantId,
		userId: user?.id,
		roleId: user?.roleId
	});

	const holdsPermission = holdsTaskSettingPermission(rolePermissions);
	// A failed refresh keeps the rows last read as the query's data, so they still decide
	const permissionsLoaded = rolePermissions !== undefined;
	const membershipsLoaded = !!user && !!activeTeam;
	const isDecided = permissionsLoaded && membershipsLoaded;
	const writesEveryRow = holdsPermission || !isDecided;

	const managedTeamIds = useMemo(() => {
		const loadedTeams = teams?.items ?? [];
		return teamsManagedBy(loadedTeams, user, employeeId);
	}, [teams, user, employeeId]);

	const canWriteInTeam = useCallback(
		(teamId: string | null | undefined) => {
			if (writesEveryRow) {
				return true;
			}
			return isManagedTeam(teamId, managedTeamIds);
		},
		[writesEveryRow, managedTeamIds]
	);

	const canWriteRow = useCallback((row: TTaskSettingRow) => canWriteInTeam(row.organizationTeamId), [canWriteInTeam]);

	// The create hooks file a new row under the active team
	const canCreate = canWriteInTeam(activeTeamId);
	const readOnlyHint = translate('settingScreen.teamSection.taskSettingsReadOnly');

	return {
		canCreate,
		canWriteRow,
		readOnlyHint
	};
}
