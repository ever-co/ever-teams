import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { TWorkspace } from '@/core/types/schemas/team/organization-team.schema';
import { getActiveTeamIdCookie } from '@/core/lib/helpers/cookies';
import { LAST_WORKSPACE_AND_TEAM } from '@/core/constants/config/constants';

/**
 * Store for the list of all workspaces available for the user
 */
export const workspacesState = atom<TWorkspace[]>([]);

/**
 * Store for the currently active workspace
 */
export const activeWorkspaceState = atom<TWorkspace | null>(null);

/**
 * Store for the active workspace ID (persisted in localStorage)
 */
export const activeWorkspaceIdState = atomWithStorage<string | null>('active-workspace-id', null);

/**
 * Store for the loading state of workspaces
 */
export const workspacesLoadingState = atom<boolean>(false);

/**
 * Store for the loading state of workspace switching
 */
export const workspaceSwitchingState = atom<boolean>(false);

/**
 * Store for errors related to workspaces
 */
export const workspacesErrorState = atom<string | null>(null);

/**
 * Utility function to find workspace by team ID
 */
const findWorkspaceByTeamId = (workspaces: TWorkspace[], teamId: string): TWorkspace | null => {
	return workspaces.find((workspace) => workspace.current_teams.some((team) => team.team_id === teamId)) || null;
};

/**
 * Derived store to get the active workspace based on smart detection
 * Priority: activeTeamId (cookie) > LAST_WORKSPACE_AND_TEAM (localStorage) > activeWorkspaceId > first workspace
 */
export const currentWorkspaceState = atom<TWorkspace | null>((get) => {
	const workspaces = get(workspacesState);
	const activeWorkspaceId = get(activeWorkspaceIdState);

	if (workspaces.length === 0) {
		return null;
	}

	// Priority 1: activeTeamId from cookie
	const activeTeamId = getActiveTeamIdCookie();
	if (activeTeamId) {
		const workspaceByTeam = findWorkspaceByTeamId(workspaces, activeTeamId);
		if (workspaceByTeam) {
			console.log('🎯 Current workspace detected by activeTeamId:', {
				activeTeamId,
				workspaceName: workspaceByTeam.user.tenant.name,
				workspaceId: workspaceByTeam.user.tenant.id
			});
			return workspaceByTeam;
		}
	}

	// Priority 2: LAST_WORKSPACE_AND_TEAM from localStorage
	if (typeof window !== 'undefined') {
		const lastTeamId = window.localStorage.getItem(LAST_WORKSPACE_AND_TEAM);
		if (lastTeamId) {
			const workspaceByLastTeam = findWorkspaceByTeamId(workspaces, lastTeamId);
			if (workspaceByLastTeam) {
				console.log('🎯 Current workspace detected by LAST_WORKSPACE_AND_TEAM:', {
					lastTeamId,
					workspaceName: workspaceByLastTeam.user.tenant.name,
					workspaceId: workspaceByLastTeam.user.tenant.id
				});
				return workspaceByLastTeam;
			}
		}
	}

	// Priority 3: activeWorkspaceId from localStorage
	if (activeWorkspaceId) {
		const workspaceById = workspaces.find((workspace) => workspace.user.tenant.id === activeWorkspaceId);
		if (workspaceById) {
			return workspaceById;
		}
	}

	// Priority 4: First workspace as fallback
	return workspaces[0] || null;
});

/**
 * Derived store to check if the user has multiple workspaces
 */
export const hasMultipleWorkspacesState = atom<boolean>((get) => {
	const workspaces = get(workspacesState);
	return workspaces.length > 1;
});

/**
 * Derived store to get inactive workspaces
 */
export const inactiveWorkspacesState = atom<TWorkspace[]>((get) => {
	const workspaces = get(workspacesState);
	const activeWorkspaceId = get(activeWorkspaceIdState);

	return workspaces.filter((workspace) => workspace.user.tenant.id !== activeWorkspaceId);
});

/**
 * Store for the loading state of workspaces
 */
export const workspacesFetchingState = atom<boolean>(false);

/**
 * Store to indicate if workspaces have been initialized
 */
export const workspacesInitializedState = atom<boolean>(false);

/**
 * Action atom to sync activeWorkspaceId with the current workspace
 * This ensures localStorage stays in sync with the detected current workspace
 */
export const syncActiveWorkspaceIdState = atom(null, (get, set) => {
	const currentWorkspace = get(currentWorkspaceState);
	const currentActiveWorkspaceId = get(activeWorkspaceIdState);

	if (currentWorkspace && currentWorkspace.user.tenant.id !== currentActiveWorkspaceId) {
		set(activeWorkspaceIdState, currentWorkspace.user.tenant.id);
	}
});
