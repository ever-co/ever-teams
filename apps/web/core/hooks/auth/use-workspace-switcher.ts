'use client';

import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { useMutation } from '@tanstack/react-query';
import { workspaceService } from '@/core/services/client/api/auth';
import { workspaceSwitchingState, workspacesErrorState, activeWorkspaceIdState } from '@/core/stores/auth';
import { TWorkspace } from '@/core/types/schemas/team/organization-team.schema';
import { LAST_WORKSPACE_AND_TEAM } from '@/core/constants/config/constants';
import { useWorkspaces } from './use-workspaces';
import { useAuthenticateUser } from './use-authenticate-user';
import { toast } from 'sonner';
import { queryKeys } from '@/core/query/keys';

/**
 * Hook for managing workspace switching
 */
export function useWorkspaceSwitcher() {
	const { user } = useAuthenticateUser();
	const { workspaces } = useWorkspaces();

	const [isSwitching, setIsSwitching] = useAtom(workspaceSwitchingState);
	const [error, setError] = useAtom(workspacesErrorState);
	const [activeWorkspaceId, setActiveWorkspaceId] = useAtom(activeWorkspaceIdState);

	/**
	 * Retrieves the last used team from localStorage
	 */
	const getLastUsedTeamId = useCallback((): string | null => {
		if (typeof window === 'undefined') return null;
		return window.localStorage.getItem(LAST_WORKSPACE_AND_TEAM);
	}, []);

	/**
	 * Retrieves the last used team for a specific workspace
	 */
	const getLastUsedTeamForWorkspace = useCallback((workspaceId: string): string | null => {
		if (typeof window === 'undefined') return null;
		const key = `${LAST_WORKSPACE_AND_TEAM}_${workspaceId}`;
		return window.localStorage.getItem(key);
	}, []);

	/**
	 * Saves the last used team to localStorage (global)
	 */
	const saveLastUsedTeamId = useCallback((teamId: string) => {
		if (typeof window === 'undefined') return;
		window.localStorage.setItem(LAST_WORKSPACE_AND_TEAM, teamId);
	}, []);

	/**
	 * Saves the last used team for a specific workspace
	 */
	const saveLastUsedTeamForWorkspace = useCallback((workspaceId: string, teamId: string): void => {
		if (typeof window === 'undefined') return;
		const key = `${LAST_WORKSPACE_AND_TEAM}_${workspaceId}`;
		window.localStorage.setItem(key, teamId);
	}, []);

	/**
	 * Intelligently selects the appropriate team for a given workspace
	 * Priority order:
	 * 1. Last used team in this workspace (from localStorage)
	 * 2. Default team (if marked as default)
	 * 3. User's primary team (if user is member)
	 * 4. First available team (fallback)
	 */
	const selectTargetTeam = useCallback(
		(workspace: TWorkspace): string => {
			if (!workspace.current_teams || workspace.current_teams.length === 0) {
				console.warn(`No teams available in workspace ${workspace.user.tenant.name}`);
				return '';
			}

			// 1. Try to get last used team for this specific workspace
			const lastUsedTeamForWorkspace = getLastUsedTeamForWorkspace(workspace.user.tenant.id);
			if (lastUsedTeamForWorkspace) {
				const lastUsedTeam = workspace.current_teams.find((team) => team.team_id === lastUsedTeamForWorkspace);
				if (lastUsedTeam) {
					console.log(`Team selected for workspace ${workspace.user.tenant.name}:`, {
						teamId: lastUsedTeam.team_id,
						teamName: lastUsedTeam.team_name,
						reason: 'Last used team for this workspace'
					});
					return lastUsedTeam.team_id || '';
				}
			}

			// 2. Try to get globally last used team
			const globalLastUsedTeamId = getLastUsedTeamId();
			if (globalLastUsedTeamId) {
				const globalLastUsedTeam = workspace.current_teams.find(
					(team) => team.team_id === globalLastUsedTeamId
				);
				if (globalLastUsedTeam) {
					console.log(`Team selected for workspace ${workspace.user.tenant.name}:`, {
						teamId: globalLastUsedTeam.team_id,
						teamName: globalLastUsedTeam.team_name,
						reason: 'Global last used team'
					});
					return globalLastUsedTeam.team_id || '';
				}
			}

			// 3. Use first available team (fallback)
			// Note: current_teams doesn't have detailed member info, so we use the first team
			const fallbackTeam = workspace.current_teams[0];
			if (fallbackTeam) {
				console.log(`Team selected for workspace ${workspace.user.tenant.name}:`, {
					teamId: fallbackTeam.team_id,
					teamName: fallbackTeam.team_name,
					reason: 'First available team (API limitation - no member details)'
				});
				return fallbackTeam.team_id || '';
			}

			console.log(`No teams found for workspace ${workspace.user.tenant.name}`);
			return '';
		},
		[getLastUsedTeamId, getLastUsedTeamForWorkspace, user?.id]
	);

	/**
	 * Mutation to switch workspace
	 */
	const switchWorkspaceMutation = useMutation({
		mutationKey: queryKeys.auth.switchWorkspace(undefined, user?.id),

		mutationFn: async (request: { targetWorkspaceId: string }) => {
			return await workspaceService.switchToWorkspace({
				targetWorkspaceId: request.targetWorkspaceId,
				user: user,
				workspaces: workspaces // Pass existing workspaces to avoid 401 call
			});
		},
		onSuccess: async (_, variables) => {
			// Update local state with the target workspace
			setActiveWorkspaceId(variables.targetWorkspaceId);

			// Show success message
			toast.success('Workspace changed successfully');

			// Navigation (EXACT same as passcode) - NO reload, just navigation!
			if (typeof window !== 'undefined') {
				// The localStorage save is already done in the service
				// Just navigate like in passcode
				window.location.href = '/';
			}
		},
		onError: (error: any) => {
			const errorMessage = error.message || 'Error switching workspace';
			setError(errorMessage);
			toast.error(errorMessage);
		},
		onSettled: () => {
			setIsSwitching(false);
		}
	});

	/**
	 * Main function to switch workspace
	 */
	const switchToWorkspace = useCallback(
		async (targetWorkspaceId: string) => {
			try {
				setIsSwitching(true);
				setError(null);

				// Verify user is authenticated
				if (!user?.email) {
					throw new Error('User not authenticated');
				}

				// Find target workspace
				const targetWorkspace = workspaces.find((w) => w.user.tenant.id === targetWorkspaceId);
				if (!targetWorkspace) {
					throw new Error('Workspace not found');
				}

				// Check if workspace has teams
				if (targetWorkspace.current_teams.length === 0) {
					throw new Error('No teams available in this workspace');
				}

				// Execute the switch (service handles team selection and localStorage)
				await switchWorkspaceMutation.mutateAsync({
					targetWorkspaceId: targetWorkspaceId
				});
			} catch (error: any) {
				const errorMessage = error.message || 'Error switching workspace';
				setError(errorMessage);
				setIsSwitching(false);
				toast.error(errorMessage);
			}
		},
		[user?.email, switchWorkspaceMutation, setIsSwitching, setError]
	);

	/**
	 * Check if a workspace switch is possible
	 */
	const canSwitchToWorkspace = useCallback(
		(workspaceId: string): boolean => {
			const workspace = workspaces.find((w) => w.user.tenant.id === workspaceId);
			return !!(
				workspace &&
				workspace.current_teams.length > 0 &&
				workspace.user.tenant.id !== activeWorkspaceId
			);
		},
		[workspaces, activeWorkspaceId]
	);

	/**
	 * Get available workspaces for switching
	 */
	const getAvailableWorkspaces = useCallback(() => {
		return workspaces.filter((w) => w.user.tenant.id !== activeWorkspaceId && w.current_teams.length > 0);
	}, [workspaces, activeWorkspaceId]);

	/**
	 * Reset error state
	 */
	const clearError = useCallback(() => {
		setError(null);
	}, [setError]);

	return {
		// Actions
		switchToWorkspace,
		canSwitchToWorkspace,
		getAvailableWorkspaces,
		clearError,

		// States
		isSwitching,
		error,

		// Utilities
		getLastUsedTeamId,
		getLastUsedTeamForWorkspace,
		saveLastUsedTeamId,
		saveLastUsedTeamForWorkspace,
		selectTargetTeam,

		// Mutation for advanced control
		switchWorkspaceMutation
	};
}
