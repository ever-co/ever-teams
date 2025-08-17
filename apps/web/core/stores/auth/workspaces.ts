import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { TWorkspace } from '@/core/types/schemas/team/organization-team.schema';

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
 * Derived store to get the active workspace based on ID
 */
export const currentWorkspaceState = atom<TWorkspace | null>((get) => {
	const workspaces = get(workspacesState);
	const activeWorkspaceId = get(activeWorkspaceIdState);

	if (!activeWorkspaceId || workspaces.length === 0) {
		return null;
	}

	return workspaces.find((workspace) => workspace.user.tenant.id === activeWorkspaceId) || null;
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
