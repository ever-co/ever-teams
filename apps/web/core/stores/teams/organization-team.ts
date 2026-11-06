import { atom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { isTenantAdminRole } from '@/core/lib/utils/roles';
import { indexTaskTotalWorkedDurations } from '@/core/lib/utils/task.utils';
import { ERoleName } from '@/core/types/generics/enums/role';
import { TOrganizationTeam, TOrganizationTeamEmployee } from '@/core/types/schemas';
import { userState } from '../user/user';

export const organizationTeamsState = atom<TOrganizationTeam[]>([]);

export const activeTeamIdState = atom<string | null>(null);

export const teamsFetchingState = atom<boolean>(false);

// True until the shell's team query owner receives the active team's detail (the day's member statistics).
export const activeTeamDetailLoadingState = atom<boolean>(false);

export const isTeamMemberState = atom<boolean>(true);
export const isTeamMemberJustDeletedState = atom<boolean>(false);

export const isTeamJustDeletedState = atom<boolean>(false);

export const isOTRefreshingState = atom<boolean>(false);

// Number of mounted team views. While positive, the shell refreshes the team detail faster.
export const teamPresenceViewCountState = atom<number>(0);

export const activeTeamState = atom<
	TOrganizationTeam | null,
	[((prev: TOrganizationTeam) => TOrganizationTeam) | TOrganizationTeam],
	void
>(
	(get) => {
		const teams = get(organizationTeamsState);
		const activeId = get(activeTeamIdState);

		// 🎯 FIX: Only fallback to teams[0] if no activeId is set
		// This prevents switching to first team when activeId exists but teams aren't loaded yet
		if (activeId) {
			return teams.find((team) => team.id === activeId) || null;
		}

		// Only use first team as fallback when no specific team is selected
		return teams[0] || null;
	},
	(get, set, update) => {
		const teams = get(organizationTeamsState);
		const activeId = get(activeTeamIdState);

		// 🎯 FIX: Consistent logic with getter - only fallback to teams[0] if no activeId
		const currentTeam = activeId ? teams.find((team) => team.id === activeId) : teams[0];

		if (!currentTeam) return;

		const updatedTeam =
			typeof update === 'function'
				? (update as (prev: TOrganizationTeam) => TOrganizationTeam)(currentTeam)
				: update;

		const updatedTeams = teams.map((team) => (team.id === currentTeam.id ? updatedTeam : team));

		set(organizationTeamsState, updatedTeams);
	}
);

export const memberActiveTaskIdState = atom<string | null>(null);

export const publicActiveTeamState = atom<TOrganizationTeam | undefined>(undefined);

const MANAGER_ROLE_NAMES: ReadonlySet<string | undefined> = new Set([
	ERoleName.MANAGER,
	ERoleName.SUPER_ADMIN,
	ERoleName.ADMIN
]);

export function isTeamManagerMember(member: TOrganizationTeamEmployee | undefined) {
	const isFlaggedManager = member?.isManager === true;
	const hasManagerRole = MANAGER_ROLE_NAMES.has(member?.role?.name);
	return isFlaggedManager || hasManagerRole;
}

function selectTeamManagers(activeTeam: TOrganizationTeam | null | undefined): TOrganizationTeamEmployee[] {
	const members = activeTeam?.members;
	return members?.filter(isTeamManagerMember) || [];
}

function haveSameMembers(previous: TOrganizationTeamEmployee[], next: TOrganizationTeamEmployee[]) {
	if (previous.length !== next.length) {
		return false;
	}
	return previous.every((member, index) => member === next[index]);
}

// A team refetch rebuilds the team object even when its managers did not change; keeping the previous array
// spares a render to every reader of the manager list.
export const activeTeamManagersState = selectAtom(activeTeamState, selectTeamManagers, haveSameMembers);

/**
 * The active team's ids and projects, which requests are scoped with. Same field names as the team, so a hook that
 * only builds query keys or request scopes reads this instead of the team: it re-renders when an id or the project
 * list changes, not on every refresh of the members.
 */
type TActiveTeamScope = Pick<
	TOrganizationTeam,
	'id' | 'organizationId' | 'tenantId' | 'projects' | 'defaultProjectId'
>;

function selectTeamScope(activeTeam: TOrganizationTeam | null): TActiveTeamScope | null {
	if (!activeTeam) {
		return null;
	}
	return {
		id: activeTeam.id,
		organizationId: activeTeam.organizationId,
		tenantId: activeTeam.tenantId,
		projects: activeTeam.projects,
		defaultProjectId: activeTeam.defaultProjectId
	};
}

function projectIdsOf(scope: TActiveTeamScope) {
	const projects = scope.projects ?? [];
	return projects.map((project) => project.id).join(',');
}

function haveSameScope(previous: TActiveTeamScope | null, next: TActiveTeamScope | null) {
	if (previous === next) {
		return true;
	}
	if (!previous || !next) {
		return false;
	}
	const isSameTeam = previous.id === next.id;
	const isSameOrganization = previous.organizationId === next.organizationId;
	const isSameTenant = previous.tenantId === next.tenantId;
	const isSameProjects = projectIdsOf(previous) === projectIdsOf(next);
	const isSameDefaultProject = previous.defaultProjectId === next.defaultProjectId;
	return isSameTeam && isSameOrganization && isSameTenant && isSameProjects && isSameDefaultProject;
}

export const activeTeamScopeState = selectAtom(activeTeamState, selectTeamScope, haveSameScope);

export const activeTeamNameState = selectAtom(activeTeamState, (activeTeam) => activeTeam?.name);

export const activeTeamRequiresPlanState = selectAtom(activeTeamState, (activeTeam) => activeTeam?.requirePlanToTrack);

export const activeTeamCreatedByUserIdState = selectAtom(activeTeamState, (activeTeam) => activeTeam?.createdByUserId);

export const activeTeamCreatorUserIdState = selectAtom(activeTeamState, (activeTeam) => activeTeam?.createdByUser?.id);

/** The member of the active team who is this user and manages it, the team creator aside. */
export function findTeamManagerOfUser(
	managers: TOrganizationTeamEmployee[],
	userId: string | undefined
): TOrganizationTeamEmployee | undefined {
	if (!userId) {
		return undefined;
	}
	return managers.find((member) => member.employee?.userId === userId);
}

export function isTeamCreatorUser(createdByUserId: string | null | undefined, userId: string | undefined) {
	const hasCreator = Boolean(createdByUserId);
	const isSameUser = createdByUserId === userId;
	return hasCreator && isSameUser;
}

// The signed-in user's own role in the active team, for the readers outside a member row (sidebar, project modal,
// task details). Derived here instead of written by every hook instance, which let a member card write its member's role.
export const isTeamManagerState = atom((get) => {
	const userId = get(userState)?.id;
	const managers = get(activeTeamManagersState);
	const createdByUserId = get(activeTeamCreatedByUserIdState);
	const manager = findTeamManagerOfUser(managers, userId);
	// Team creator should automatically be considered a manager (business logic fix)
	return Boolean(manager) || isTeamCreatorUser(createdByUserId, userId);
});

/**
 * Whether the signed-in user's own row of the active team carries the manager flag. The API lets a team manager act
 * for the members (their plans, time and activity) only with that flag; the role or having created the team is not
 * enough there.
 */
export const isFlaggedTeamManagerState = atom((get) => {
	const userId = get(userState)?.id;
	const managers = get(activeTeamManagersState);
	const manager = findTeamManagerOfUser(managers, userId);
	return manager?.isManager === true;
});

export const isOrganizationAdminState = atom((get) => {
	const roleName = get(userState)?.role?.name;
	return isTenantAdminRole(roleName);
});

/** An organization admin runs every team, so they manage its settings as its own managers do. */
export const canManageActiveTeamState = atom((get) => {
	const isTeamManager = get(isTeamManagerState);
	const isOrganizationAdmin = get(isOrganizationAdminState);
	return isTeamManager || isOrganizationAdmin;
});

/** Built once per team update so components rendered per task only do a map lookup. */
export const activeTeamWorkedDurationByTaskState = atom((get) =>
	indexTaskTotalWorkedDurations(get(activeTeamState)?.members)
);
