'use client';

import { useCallback, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useWorkspaces } from './use-workspaces';
import { workspaceService } from '@/core/services/client/api/auth';
import { TWorkspace } from '@/core/types/schemas/team/organization-team.schema';
import { LAST_WORKSPACE_AND_TEAM, USER_SAW_OUTSTANDING_NOTIFICATION } from '@/core/constants/config/constants';
import { findMostRecentWorkspace } from '@/core/lib/utils/date-comparison.utils';
import { useUserQuery } from '../queries/user-user.query';
import { setAuthCookies, getOrganizationIdCookie } from '@/core/lib/helpers/cookies';

export function useWorkspaceSwitcher() {
	const { data: user } = useUserQuery();
	const { workspaces } = useWorkspaces();

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

	const switchWorkspaceMutation = useMutation({
		mutationFn: async ({ workspace, selectedTeam }: { workspace: TWorkspace; selectedTeam: string }) => {
			// Use switchWorkspace with only tenantId
			const tenantId = workspace.user.tenant.id;
			const response = await workspaceService.switchWorkspace(tenantId);

			// Return both response and selectedTeam for onSuccess
			return { response, selectedTeam, workspace };
		},
		onSuccess: async ({ response, selectedTeam }) => {
			// Extract data from response
			const { user: authUser, token, refresh_token } = response;
			const tenantId = authUser.tenantId || '';
			const userId = authUser.id || '';

			// Get organizationId from user.employee or fallback to current cookie
			const organizationId = authUser.employee?.organizationId || getOrganizationIdCookie() || '';

			// Update cookies with new authentication data
			setAuthCookies({
				access_token: token,
				refresh_token: {
					token: refresh_token
				},
				teamId: selectedTeam,
				tenantId,
				organizationId,
				languageId: 'en',
				noTeamPopup: true,
				userId
			});

			// NOTE_CRITICAL: Do NOT update Jotai states here!
			// Updating states while components are mounted causes "Maximum update depth exceeded"
			// The page reload will reinitialize all states automatically from cookies

			// Show success message
			toast.success('Workspace changed successfully');

			// NOTE_CRITICAL: Use hard navigation (window.location) instead of router.push()
			// This forces a full page reload which:
			// 1. Clears all React Query cache automatically
			// 2. Reinitializes all components with new workspace context
			// 3. Prevents stale queries with old organizationId/teamId
			// 4. Avoids "Maximum update depth exceeded" errors from state updates
			if (typeof window !== 'undefined') {
				window.location.href = '/';
			}
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
