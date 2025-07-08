'use client';

import { useCallback } from 'react';
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

	/**
	 * Intelligent cache management utility
	 */
	const manageCacheIntelligently = useCallback(
		async (teamId: string) => {
			// Prefetch related data that will likely be needed
			const prefetchPromises = [
				// Prefetch team data for the new workspace
				queryClient.prefetchQuery({
					queryKey: queryKeys.organizationTeams.detail(teamId),
					staleTime: 1000 * 60 * 10 // 10 minutes
				}),
				// Prefetch tasks for the new team
				queryClient.prefetchQuery({
					queryKey: queryKeys.tasks.byTeam(teamId),
					staleTime: 1000 * 60 * 5 // 5 minutes
				})
			];

			// Execute prefetches in background (don't wait for them)
			Promise.allSettled(prefetchPromises).catch((error) => {
				console.warn('Prefetch error (non-critical):', error);
			});
		},
		[queryClient]
	);

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
	 * Retrieves the last used team for a specific workspace
	 */
	const getLastUsedTeamForWorkspace = useCallback((workspaceId: string): string | null => {
		if (typeof window === 'undefined') return null;
		const key = `${LAST_WORSPACE_AND_TEAM}_${workspaceId}`;
		return window.localStorage.getItem(key);
	}, []);

	/**
	 * Saves the last used team to localStorage (global)
	 */
	const saveLastUsedTeamId = useCallback((teamId: string) => {
		if (typeof window === 'undefined') return;
		window.localStorage.setItem(LAST_WORSPACE_AND_TEAM, teamId);
	}, []);

	/**
	 * Saves the last used team for a specific workspace
	 */
	const saveLastUsedTeamForWorkspace = useCallback((workspaceId: string, teamId: string): void => {
		if (typeof window === 'undefined') return;
		const key = `${LAST_WORSPACE_AND_TEAM}_${workspaceId}`;
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
			if (!workspace.teams || workspace.teams.length === 0) {
				console.warn(`No teams available in workspace ${workspace.name}`);
				return '';
			}

			// 1. Try to get last used team for this specific workspace
			const lastUsedTeamForWorkspace = getLastUsedTeamForWorkspace(workspace.id);
			if (lastUsedTeamForWorkspace) {
				const lastUsedTeam = workspace.teams.find((team) => team.id === lastUsedTeamForWorkspace);
				if (lastUsedTeam) {
					console.log(`Team selected for workspace ${workspace.name}:`, {
						teamId: lastUsedTeam.id,
						teamName: lastUsedTeam.name,
						reason: 'Last used team for this workspace'
					});
					return lastUsedTeam.id || '';
				}
			}

			// 1.5. Fallback to global last used team
			const globalLastUsedTeamId = getLastUsedTeamId();
			if (globalLastUsedTeamId) {
				const globalLastUsedTeam = workspace.teams.find((team) => team.id === globalLastUsedTeamId);
				if (globalLastUsedTeam) {
					console.log(`Team selected for workspace ${workspace.name}:`, {
						teamId: globalLastUsedTeam.id,
						teamName: globalLastUsedTeam.name,
						reason: 'Global last used team'
					});
					return globalLastUsedTeam.id || '';
				}
			}

			// 2. Try to find default team
			const defaultTeam = workspace.teams.find((team) => team.isDefault);
			if (defaultTeam) {
				console.log(`Team selected for workspace ${workspace.name}:`, {
					teamId: defaultTeam.id,
					teamName: defaultTeam.name,
					reason: 'Default team'
				});
				return defaultTeam.id || '';
			}

			// 3. Try to find user's primary team (where user is active member)
			if (user?.id) {
				const userPrimaryTeam = workspace.teams.find((team) =>
					team.members?.some((member) => member.employee?.userId === user.id && member.isActive)
				);
				if (userPrimaryTeam) {
					console.log(`Team selected for workspace ${workspace.name}:`, {
						teamId: userPrimaryTeam.id,
						teamName: userPrimaryTeam.name,
						reason: 'User primary team'
					});
					return userPrimaryTeam.id || '';
				}
			}

			// 4. Fallback to first available team
			const fallbackTeam = workspace.teams[0];
			console.log(`Team selected for workspace ${workspace.name}:`, {
				teamId: fallbackTeam.id,
				teamName: fallbackTeam.name,
				reason: 'First available team (fallback)'
			});

			return fallbackTeam.id || '';
		},
		[getLastUsedTeamId, getLastUsedTeamForWorkspace, user?.id]
	);

	/**
	 * Mutation to switch workspace
	 */
	const switchWorkspaceMutation = useMutation({
		mutationKey: queryKeys.auth.switchWorkspace(undefined, user?.id),

		mutationFn: async (request: { teamId: string; email: string }) => {
			return await workspaceService.switchWorkspace(request.teamId, request.email);
		},
		onSuccess: async (response, variables) => {
			if (response) {
				// Update local state
				setActiveWorkspace(variables.teamId);
				setActiveWorkspaceId(variables.teamId);

				// Save the last used team (global and per workspace)
				saveLastUsedTeamId(variables.teamId);

				// Find the workspace to save team preference per workspace
				const currentWorkspace = workspaces.find((w) => w.teams.some((team) => team.id === variables.teamId));
				if (currentWorkspace) {
					saveLastUsedTeamForWorkspace(currentWorkspace.id, variables.teamId);
				}

				// Intelligent cache management and prefetching
				manageCacheIntelligently(variables.teamId);

				// Optimistic cache updates for better performance
				try {
					// Update workspaces cache optimistically
					queryClient.setQueryData(
						queryKeys.auth.workspaces(user?.id),
						(oldData: TWorkspace[] | undefined) => {
							if (!oldData) return oldData;
							return oldData.map((workspace) => ({
								...workspace,
								isActive: workspace.teams.some((team) => team.id === variables.teamId)
							}));
						}
					);

					// Invalidate only critical queries that need fresh data
					await Promise.all([
						queryClient.invalidateQueries({ queryKey: queryKeys.users.me }),
						queryClient.invalidateQueries({ queryKey: queryKeys.organizationTeams.all }),
						// Selectively invalidate team-related queries
						queryClient.invalidateQueries({
							queryKey: ['organization-teams'],
							exact: false,
							refetchType: 'active' // Only refetch active queries
						})
					]);

					// Background refresh of workspaces to ensure consistency
					queryClient.refetchQueries({
						queryKey: queryKeys.auth.workspaces(user?.id),
						type: 'active'
					});
				} catch (cacheError) {
					console.warn('Cache update error:', cacheError);
					// Fallback to full invalidation if optimistic update fails
					await queryClient.invalidateQueries({ queryKey: queryKeys.auth.workspaces(user?.id) });
				}

				// Show success message
				toast.success('Workspace changed successfully');

				// Use optimized navigation instead of brutal reload
				try {
					if (response.data.loginResponse) {
						// New login response - redirect to home
						router.push('/');
					} else {
						// Existing session - use router refresh for smooth transition
						router.refresh();

						// Navigate to home to ensure clean state
						setTimeout(() => {
							router.push('/');
						}, 100);
					}
				} catch (navigationError) {
					console.error('Navigation error after workspace switch:', navigationError);
					// Fallback to reload only if navigation fails
					window.location.href = '/';
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
		getLastUsedTeamForWorkspace,
		saveLastUsedTeamId,
		saveLastUsedTeamForWorkspace,
		selectTargetTeam,

		// Mutation for advanced control
		switchWorkspaceMutation
	};
}
