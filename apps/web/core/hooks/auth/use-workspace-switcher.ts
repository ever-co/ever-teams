'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useCacheInvalidation } from '@/core/hooks/common/use-cache-invalidation';
import { toast } from 'sonner';
import { useWorkspaces } from './use-workspaces';
import { authService } from '@/core/services/client/api/auth';
import { TWorkspace } from '@/core/types/schemas/team/organization-team.schema';
import { LAST_WORKSPACE_AND_TEAM, USER_SAW_OUTSTANDING_NOTIFICATION } from '@/core/constants/config/constants';
import { findMostRecentWorkspace } from '@/core/lib/utils/date-comparison.utils';
import { useUserQuery } from '../queries/user-user.query';

/**
 * Smart workspace switcher hook based on password/page-component.tsx logic
 * Reuses the existing authentication flow that works perfectly
 */
export function useWorkspaceSwitcher() {
	const router = useRouter();
	const { data: user } = useUserQuery();
	const { workspaces } = useWorkspaces();

	// Use cache invalidation hook - much cleaner than manual invalidations
	const { smartInvalidate } = useCacheInvalidation();
	/**
	 * Get last team ID with recent logout logic (from password component)
	 */
	const getLastTeamIdWithRecentLogout = useCallback((): string | null => {
		if (workspaces.length === 0) {
			return null;
		}
		const mostRecentWorkspace = findMostRecentWorkspace(workspaces);
		return mostRecentWorkspace.user.lastTeamId ?? null;
	}, [workspaces]);

	/**
	 * Check if workspaces have multiple teams (from password component)
	 */
	const hasMultipleTeams = useMemo(
		() => workspaces.some((workspace) => workspace.current_teams.length > 1),
		[workspaces]
	);

	/**
	 * Smart team selection logic (adapted from password component)
	 */
	const getSmartTeamSelection = useCallback(
		(workspace: TWorkspace): string => {
			const currentTeams = workspace.current_teams;

			if (!currentTeams || currentTeams.length === 0) {
				throw new Error('No teams available in this workspace');
			}

			// Priority 1: Last selected team from localStorage
			const lastSelectedTeamFromStorage =
				typeof window !== 'undefined' ? window.localStorage.getItem(LAST_WORKSPACE_AND_TEAM) : null;

			// Priority 2: Last team from API
			const lastSelectedTeamFromAPI = getLastTeamIdWithRecentLogout();

			// Check if last selected team exists in current workspace
			if (
				lastSelectedTeamFromStorage &&
				currentTeams.find((team) => team.team_id === lastSelectedTeamFromStorage)
			) {
				return lastSelectedTeamFromStorage;
			}

			if (lastSelectedTeamFromAPI && currentTeams.find((team) => team.team_id === lastSelectedTeamFromAPI)) {
				return lastSelectedTeamFromAPI;
			}

			// Priority 3: First team in workspace
			return currentTeams[0].team_id;
		},
		[getLastTeamIdWithRecentLogout]
	);

	/**
	 * Workspace switch mutation using the EXACT same flow as password authentication
	 */
	const switchWorkspaceMutation = useMutation({
		mutationFn: async ({ workspace, selectedTeam }: { workspace: TWorkspace; selectedTeam: string }) => {
			if (!user?.email) {
				throw new Error('User email not found');
			}

			const params = {
				email: user.email,
				token: workspace.token, // THE WORKSPACE TOKEN (not tenantId!)
				defaultTeamId: selectedTeam,
				selectedTeam: selectedTeam,
				lastTeamId: selectedTeam
			};

			// Use the EXACT same parameters as password component
			return await authService.signInWorkspace(params);
		},
		onSuccess: async () => {
			// Show success message
			toast.success('Workspace changed successfully');

			// Invalidate all workspace-related queries
			// Cache invalidation using semantic hook - much cleaner and more maintainable!
			await smartInvalidate('team-creation');
			// Navigate to home (EXACT same as password component)
			router.push('/');
		},
		onError: (error: any) => {
			console.error('Error switching workspace:', error);
			toast.error(error.message || 'Error switching workspace');
		}
	});

	/**
	 * Main switch function (adapted from password component logic)
	 */
	const switchToWorkspace = useCallback(
		(workspace: TWorkspace) => {
			if (!user?.email) {
				toast.error('User not authenticated');
				return;
			}

			try {
				// Smart team selection
				const selectedTeam = getSmartTeamSelection(workspace);

				// Update localStorage (EXACT same as password component)
				if (typeof window !== 'undefined') {
					window.localStorage.removeItem(USER_SAW_OUTSTANDING_NOTIFICATION);
					window.localStorage.setItem(LAST_WORKSPACE_AND_TEAM, selectedTeam);
				}

				// Execute the switch using the proven flow
				switchWorkspaceMutation.mutate({ workspace, selectedTeam });
			} catch (error: any) {
				toast.error(error.message || 'Error preparing workspace switch');
			}
		},
		[user, getSmartTeamSelection, switchWorkspaceMutation]
	);

	return {
		switchToWorkspace,
		isLoading: switchWorkspaceMutation.isPending,
		error: switchWorkspaceMutation.error,
		hasMultipleTeams,
		getSmartTeamSelection
	};
}
