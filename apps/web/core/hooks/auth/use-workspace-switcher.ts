'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAtom } from 'jotai';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceService } from '@/core/services/client/api/auth';
import { workspaceSwitchingState, workspacesErrorState, activeWorkspaceIdState } from '@/core/stores/auth';
import { TWorkspace } from '@/core/types/schemas/team/organization-team.schema';
import { LAST_WORSPACE_AND_TEAM } from '@/core/constants/config/constants';
import { useWorkspaces } from './use-workspaces';
import { useAuthenticateUser } from './use-authenticate-user';
import { toast } from 'sonner';
import { queryKeys } from '@/core/query/keys';

/**
 * Hook for managing workspace switching
 */
export function useWorkspaceSwitcher() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { user } = useAuthenticateUser();
	const { workspaces, setActiveWorkspace } = useWorkspaces();

	const [isSwitching, setIsSwitching] = useAtom(workspaceSwitchingState);
	const [error, setError] = useAtom(workspacesErrorState);
	const [activeWorkspaceId, setActiveWorkspaceId] = useAtom(activeWorkspaceIdState);

	/**
	 * Retrieves the last used team from localStorage
	 */
	const getLastUsedTeamId = useCallback((): string | null => {
		if (typeof window === 'undefined') return null;
		return window.localStorage.getItem(LAST_WORSPACE_AND_TEAM);
	}, []);

	/**
	 * Saves the last used team to localStorage
	 */
	const saveLastUsedTeamId = useCallback((teamId: string) => {
		if (typeof window === 'undefined') return;
		window.localStorage.setItem(LAST_WORSPACE_AND_TEAM, teamId);
	}, []);

	/**
	 * Selects the appropriate team for a given workspace
	 */
	const selectTargetTeam = useCallback((workspace: TWorkspace): string => {
		const result = workspace.teams[0];

		// Log selection reason for debugging
		console.log(`Team selected for workspace ${workspace.name}:`, {
			teamId: result.id,
			reason: result.name
		});

		return result.id || '';
	}, []);

	/**
	 * Mutation to switch workspace
	 */
	const switchWorkspaceMutation = useMutation({
		mutationKey: queryKeys.auth.switchWorkspace(undefined),

		mutationFn: async (request: { teamId: string; email: string }) => {
			return await workspaceService.switchWorkspace(request.teamId, request.email);
		},
		onSuccess: (response, variables) => {
			if (response) {
				// Update local state
				setActiveWorkspace(variables.teamId);
				setActiveWorkspaceId(variables.teamId);

				// Save the last used team
				saveLastUsedTeamId(variables.teamId);

				// Invalidate relevant caches
				queryClient.invalidateQueries({ queryKey: queryKeys.auth.workspaces });
				queryClient.invalidateQueries({ queryKey: queryKeys.users.me });
				queryClient.invalidateQueries({ queryKey: queryKeys.organizationTeams.all });

				// Show success message
				toast.success('Workspace switch successful');

				// Redirect if necessary
				if (response.data.loginResponse) {
					router.push('/');
				} else {
					// Reload page to ensure all states are synchronized
					window.location.reload();
				}
			} else {
				throw new Error('Error switching workspace');
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
				const targetWorkspace = workspaces.find((w) => w.id === targetWorkspaceId);
				if (!targetWorkspace) {
					throw new Error('Workspace not found');
				}

				// Check if workspace has teams
				if (targetWorkspace.teams.length === 0) {
					throw new Error('No teams available in this workspace');
				}

				// Select target team according to defined logic
				const targetTeamId = selectTargetTeam(targetWorkspace);

				// Prepare switch request
				const switchRequest: { teamId: string; email: string } = {
					teamId: targetTeamId,
					email: user.email
				};

				// Execute the switch
				await switchWorkspaceMutation.mutateAsync(switchRequest);
			} catch (error: any) {
				const errorMessage = error.message || 'Error switching workspace';
				setError(errorMessage);
				setIsSwitching(false);
				toast.error(errorMessage);
			}
		},
		[user?.email, workspaces, selectTargetTeam, switchWorkspaceMutation, setIsSwitching, setError]
	);

	/**
	 * Check if a workspace switch is possible
	 */
	const canSwitchToWorkspace = useCallback(
		(workspaceId: string): boolean => {
			const workspace = workspaces.find((w) => w.id === workspaceId);
			return !!(workspace && workspace.teams.length > 0 && workspace.id !== activeWorkspaceId);
		},
		[workspaces, activeWorkspaceId]
	);

	/**
	 * Get available workspaces for switching
	 */
	const getAvailableWorkspaces = useCallback(() => {
		return workspaces.filter((w) => w.id !== activeWorkspaceId && w.teams.length > 0);
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
		saveLastUsedTeamId,
		selectTargetTeam,

		// Mutation for advanced control
		switchWorkspaceMutation
	};
}
