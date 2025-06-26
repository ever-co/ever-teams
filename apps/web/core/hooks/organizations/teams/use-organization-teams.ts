'use client';
import {
	getActiveTeamIdCookie,
	getOrganizationIdCookie,
	getTenantIdCookie,
	setActiveProjectIdCookie,
	setActiveTeamIdCookie,
	setOrganizationIdCookie
} from '@/core/lib/helpers/cookies';
import {
	activeTeamIdState,
	activeTeamManagersState,
	activeTeamState,
	isTeamMemberJustDeletedState,
	isTeamMemberState,
	timerStatusState
} from '@/core/stores';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
// import isEqual from 'lodash/isEqual'; // ✅ REMOVED: No longer needed after performance optimization
import { LAST_WORSPACE_AND_TEAM } from '@/core/constants/config/constants';
import { organizationTeamService } from '@/core/services/client/api/organizations/teams';
import { useFirstLoad } from '../../common';
import { useAuthenticateUser } from '../../auth';
import { useSettings } from '../../users';
import { TOrganizationTeam } from '@/core/types/schemas';
import { ZodValidationError } from '@/core/types/schemas/utils/validation';
import { useTeamsState } from './use-teams-state';
import { useCreateOrganizationTeam } from './use-create-organization-team';
import { useUpdateOrganizationTeam } from './use-update-organization-team';
import { queryKeys } from '@/core/query/keys';
import { toast } from 'sonner';

/**
 * A powerful hook for managing organization teams with complete CRUD operations and state management.
 * This hook centralizes all team-related operations and states in one place.
 *
 * @returns {Object} An object containing the following properties and methods:
 *
 * @property {() => Promise<void>} loadTeamsData
 * Function that fetches and synchronizes the latest teams data. It handles:
 * - Loading the initial teams data
 * - Updating the active team
 * - Managing team cookies
 * - Syncing with local storage
 *
 * @property {boolean} loading
 * Global loading state for team operations
 *
 * @property {IOrganizationTeamList[]} teams
 * Array containing all teams in the organization. Each team includes:
 * - Team details (id, name, etc.)
 * - Member information
 * - Projects associated
 * - Roles and permissions
 *
 * @property {boolean} teamsFetching
 * Specific loading state for team fetching operations
 *
 * @property {IOrganizationTeamList} activeTeam
 * Currently selected team with all its details
 *
 * @property {(team: IOrganizationTeamList) => void} setActiveTeam
 * Sets the active team and handles:
 * - Cookie updates
 * - Local storage sync
 * - Organization ID updates
 * - Project ID updates
 *
 * @property {(name: string) => Promise<any>} createOrganizationTeam
 * Creates a new team with validation:
 * - Checks for duplicate names
 * - Validates name length
 * - Updates necessary cookies
 * - Refreshes authentication token
 *
 * @property {boolean} createOTeamLoading
 * Loading state for team creation
 *
 * @property {any} firstLoadTeamsData
 * Initial data loaded when the hook is first initialized
 *
 * @property {(data: IOrganizationTeamUpdate) => Promise<any>} editOrganizationTeam
 * Updates existing team information with full validation
 *
 * @property {boolean} editOrganizationTeamLoading
 * Loading state for team editing operations
 *
 * @property {(id: string) => Promise<any>} deleteOrganizationTeam
 * Deletes a team and handles cleanup operations
 *
 * @property {boolean} deleteOrganizationTeamLoading
 * Loading state for team deletion
 *
 * @property {ITeamManager[]} activeTeamManagers
 * List of managers for the active team with their roles and permissions
 *
 * @property {(team: IOrganizationTeamList, data?: Partial<IOrganizationTeamUpdate>) => void} updateOrganizationTeam
 * Updates team details with partial data support
 *
 * @property {boolean} updateOTeamLoading
 * Loading state for team updates
 *
 * @property {(teams: IOrganizationTeamList[]) => void} setTeams
 * Updates the entire teams list with proper state management
 *
 * @property {boolean} isTeamMember
 * Indicates if current user is a team member
 *
 * @property {boolean} removeUserFromAllTeamLoading
 * Loading state for user removal operations
 *
 * @property {(userId: string) => Promise<any>} removeUserFromAllTeam
 * Removes user from all teams with proper cleanup:
 * - Updates user permissions
 * - Refreshes authentication
 * - Updates team states
 *
 * @property {boolean} loadingTeam
 * Loading state for single team operations
 *
 * @property {boolean} isTrackingEnabled
 * Indicates if time tracking is enabled for current user
 *
 * @property {string | null} memberActiveTaskId
 * ID of current user's active task, null if no active task
 *
 * @property {boolean} isTeamMemberJustDeleted
 * Flag indicating recent member deletion
 *
 * @property {boolean}  isTeamManager
 * If the active user is a team manager
 *
 * @property {(value: boolean) => void} setIsTeamMemberJustDeleted
 * Updates the member deletion state
 *
 * @example
 * ```typescript
 * const {
 *   teams,
 *   activeTeam,
 *   createOrganizationTeam,
 *   updateOrganizationTeam
 * } = useOrganizationTeams();
 *
 * // Create new team
 * await createOrganizationTeam("New Team Name");
 *
 * // Update team
 * await updateOrganizationTeam(activeTeam, { name: "Updated Name" });
 * ```
 */

export function useOrganizationTeams() {
	const queryClient = useQueryClient();
	const { teams, setTeams, setTeamsUpdate, teamsRef } = useTeamsState();
	const activeTeam = useAtomValue(activeTeamState);
	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();

	const activeTeamManagers = useAtomValue(activeTeamManagersState);

	// ===== React Query mutations for complex operations =====
	// editOrganizationTeam - React Query implementation
	const editOrganizationTeamMutation = useMutation({
		mutationFn: (data: Partial<TOrganizationTeam>) => {
			return organizationTeamService.editOrganizationTeam(data);
		},
		mutationKey: queryKeys.organizationTeams.mutations.edit(null),
		onSuccess: (response) => {
			// Preserve backward compatibility - exact same behavior
			setTeamsUpdate(response.data);

			// Invalidate queries for cache consistency
			queryClient.invalidateQueries({
				queryKey: queryKeys.organizationTeams.all
			});
		},
		onError: (error) => {
			// Enhanced error handling
			if (error instanceof ZodValidationError) {
				toast.error('Edit team validation failed:', {
					description: JSON.stringify({
						message: error.message,
						issues: error.issues
					})
				});
				console.error('Edit team validation failed:', {
					message: error.message,
					issues: error.issues
				});
				return;
			}
			toast.error('Edit team validation failed');
			// Original error will be thrown and handled by calling code
		}
	});

	const [activeTeamId, setActiveTeamId] = useAtom(activeTeamIdState);
	const [isTeamMemberJustDeleted, setIsTeamMemberJustDeleted] = useAtom(isTeamMemberJustDeletedState);
	const { firstLoadData: firstLoadTeamsData } = useFirstLoad();
	const [isTeamMember, setIsTeamMember] = useAtom(isTeamMemberState);
	const { updateUserFromAPI, refreshToken, user } = useAuthenticateUser();
	const { updateAvatar: updateUserLastTeam } = useSettings();
	const timerStatus = useAtomValue(timerStatusState);

	const [isTeamManager, setIsTeamManager] = useState(false);

	const members = useMemo(() => activeTeam?.members || [], [activeTeam?.members]);
	const currentUser = members.find((member) => member.employee?.userId === user?.id);

	const memberActiveTaskId =
		(timerStatus?.running && timerStatus?.lastLog?.taskId) || currentUser?.activeTaskId || null;

	const isTrackingEnabled = activeTeam?.members?.find(
		(member) => member.employee?.userId === user?.id && member.isTrackingEnabled
	)
		? true
		: false;

	// ===== REACT QUERY - GET OPERATIONS (Phase 1) =====

	// Query for organization teams list
	const organizationTeamsQuery = useQuery({
		queryKey: queryKeys.organizationTeams.all,
		queryFn: async () => {
			if (!user?.employee?.organizationId || !user?.employee?.tenantId) {
				throw new Error('Organization ID and Tenant ID are required');
			}
			return await organizationTeamService.getOrganizationTeams(
				user.employee.organizationId,
				user.employee.tenantId
			);
		},
		enabled: !!(user?.employee?.organizationId && user?.employee?.tenantId),
		staleTime: 1000 * 60 * 10, // PERFORMANCE FIX: Increased to 10 minutes to reduce refetching
		gcTime: 1000 * 60 * 30, // PERFORMANCE FIX: Increased to 30 minutes
		refetchOnWindowFocus: false, // PERFORMANCE FIX: Disable aggressive refetching
		refetchOnReconnect: false // PERFORMANCE FIX: Disable aggressive refetching
	});

	// Query for specific team details
	const organizationTeamQuery = useQuery({
		queryKey: queryKeys.organizationTeams.detail(activeTeamId),
		queryFn: async () => {
			if (!activeTeamId || !user?.employee?.organizationId || !user?.employee?.tenantId) {
				throw new Error('Team ID, Organization ID and Tenant ID are required');
			}
			return await organizationTeamService.getOrganizationTeam(
				activeTeamId,
				user.employee.organizationId,
				user.employee.tenantId
			);
		},
		enabled: !!(activeTeamId && user?.employee?.organizationId && user?.employee?.tenantId),
		staleTime: 1000 * 60 * 10, // PERFORMANCE FIX: Increased to 10 minutes
		gcTime: 1000 * 60 * 30, // PERFORMANCE FIX: Increased to 30 minutes
		refetchOnWindowFocus: false, // PERFORMANCE FIX: Disable aggressive refetching
		refetchOnReconnect: false // PERFORMANCE FIX: Disable aggressive refetching
	});

	// ===== SYNCHRONIZATION WITH JOTAI (Backward Compatibility) =====

	// Sync organization teams data with Jotai state
	useEffect(() => {
		if (organizationTeamsQuery.data?.data?.items) {
			const latestTeams = organizationTeamsQuery.data.data.items;

			// PERFORMANCE FIX: Use simple length check instead of expensive sorting + deep equality
			const currentTeams = teamsRef.current;
			const shouldUpdate =
				currentTeams.length !== latestTeams.length ||
				!latestTeams.every((team) => currentTeams.some((current) => current.id === team.id));

			if (shouldUpdate) {
				setTeams(latestTeams);
			}

			// Handle case where user might be removed from all teams
			if (latestTeams.length === 0) {
				setIsTeamMember(false);
				setIsTeamMemberJustDeleted(true);
			}
		}
	}, [organizationTeamsQuery.data, setTeams, setIsTeamMember, setIsTeamMemberJustDeleted]); // REMOVED teamsRef

	// Sync specific team data with Jotai state
	useEffect(() => {
		if (organizationTeamQuery.data?.data) {
			const newTeam = organizationTeamQuery.data.data;

			// PERFORMANCE FIX: Only update if team data actually changed
			const currentActiveTeam = activeTeam;
			if (
				!currentActiveTeam ||
				currentActiveTeam.id !== newTeam.id ||
				currentActiveTeam.updatedAt !== newTeam.updatedAt
			) {
				setTeamsUpdate(newTeam);

				// Set Project Id to cookie
				if (newTeam && newTeam.projects && newTeam.projects.length) {
					setActiveProjectIdCookie(newTeam.projects[0].id);
				}
			}
		}
	}, [organizationTeamQuery.data, setTeamsUpdate, activeTeam]);

	// ===== LEGACY HOOKS FOR MUTATIONS & CREATION (Phase 2 & 3) =====
	const { createOrganizationTeam, loading: createOTeamLoading } = useCreateOrganizationTeam();
	const { updateOrganizationTeam, loading: updateOTeamLoading } = useUpdateOrganizationTeam();

	const isManager = useCallback(() => {
		const $u = user;
		const isM = members.find((member) => {
			const isUser = member.employee?.userId === $u?.id;
			return isUser && member.role && member.role.name === 'MANAGER';
		});
		setIsTeamManager(!!isM);
	}, [user, members]);

	const setActiveTeam = useCallback(
		(team: (typeof teams)[0]) => {
			setActiveTeamIdCookie(team?.id);
			setOrganizationIdCookie(team?.organizationId || '');
			// This must be called at the end (Update store)
			setActiveTeamId(team?.id);

			// Set Project Id to cookie
			// TODO: Make it dynamic when we add Dropdown in Navbar
			if (team && team?.projects && team.projects.length) {
				setActiveProjectIdCookie(team.projects[0].id);
			}
			window && window?.localStorage.setItem(LAST_WORSPACE_AND_TEAM, team.id);
			// Only update user last team if it's different to avoid unnecessary API calls
			if (user && user.lastTeamId !== team.id) {
				updateUserLastTeam({ id: user.id, lastTeamId: team.id });
			}
		},
		[setActiveTeamId, updateUserLastTeam, user]
	);

	// ===== BACKWARD COMPATIBLE FUNCTIONS =====

	const loadTeamsData = useCallback(async () => {
		if (!user?.employee?.organizationId || !user?.employee?.tenantId) {
			return;
		}

		let teamId = getActiveTeamIdCookie();
		setActiveTeamId(teamId);

		try {
			// Trigger React Query refetch for teams
			const teamsResult = await queryClient.fetchQuery({
				queryKey: queryKeys.organizationTeams.all,
				queryFn: async () => {
					if (!user.employee?.organizationId || !user.employee?.tenantId) {
						throw new Error('Organization ID and Tenant ID are required');
					}
					return await organizationTeamService.getOrganizationTeams(
						user.employee.organizationId,
						user.employee.tenantId
					);
				}
			});

			const latestTeams = teamsResult.data?.items || [];

			if (latestTeams.length === 0) {
				setIsTeamMember(false);
				setIsTeamMemberJustDeleted(true);
			}

			// Handle case where user might be removed from all teams
			if (!latestTeams.find((team: any) => team.id === teamId) && latestTeams.length) {
				setIsTeamMemberJustDeleted(true);
				setActiveTeam(latestTeams[0]);
			} else if (!latestTeams.length) {
				teamId = '';
			}

			// Fetch specific team details if teamId exists
			if (teamId && user?.employee?.organizationId && user?.employee.tenantId) {
				await queryClient.fetchQuery({
					queryKey: queryKeys.organizationTeams.detail(teamId),
					queryFn: async () => {
						if (!user.employee?.organizationId || !user.employee?.tenantId) {
							throw new Error('Organization ID and Tenant ID are required');
						}
						return await organizationTeamService.getOrganizationTeam(
							teamId,
							user.employee.organizationId,
							user.employee.tenantId
						);
					}
				});
			}

			return teamsResult;
		} catch (error) {
			console.error('Error loading teams data:', error);
			throw error;
		}
	}, [
		queryClient,
		user?.employee?.organizationId,
		user?.employee?.tenantId,
		setActiveTeamId,
		setIsTeamMember,
		setIsTeamMemberJustDeleted,
		setActiveTeam
	]);

	// deleteOrganizationTeam - React Query implementation (after loadTeamsData definition)
	const deleteOrganizationTeamMutation = useMutation({
		mutationFn: (id: string) => {
			return organizationTeamService.deleteOrganizationTeam(id);
		},
		mutationKey: queryKeys.organizationTeams.mutations.delete(null),
		onSuccess: async (response) => {
			// Preserve critical side-effect - loadTeamsData() for complete refetch
			await loadTeamsData();

			// Invalidate queries for cache consistency
			queryClient.invalidateQueries({
				queryKey: queryKeys.organizationTeams.all
			});
		},
		onError: (error) => {
			// Enhanced error handling
			if (error instanceof ZodValidationError) {
				toast.error('Delete team validation failed', {
					description: JSON.stringify({
						message: error.message,
						issues: error.issues
					})
				});
				console.error('Delete team validation failed:', {
					message: error.message,
					issues: error.issues
				});
				return;
			}
			toast.error('Delete team validation failed');
			// Original error will be thrown and handled by calling code
		}
	});

	// removeUserFromAllTeam - React Query implementation (most complex with auth side-effects)
	const removeUserFromAllTeamMutation = useMutation({
		mutationFn: (userId: string) => {
			return organizationTeamService.removeUserFromAllTeams(userId);
		},
		mutationKey: queryKeys.organizationTeams.mutations.removeUser(null),
		onSuccess: async (response) => {
			// Service returns simple DeleteResponse, no complex validation needed
			// Just ensure response exists

			// Preserve ALL critical side-effects in exact order
			// 1. First: Reload teams data
			await loadTeamsData();

			// 2. Then: Critical auth refresh sequence
			try {
				await refreshToken();
				// 3. Finally: Update user data from API
				updateUserFromAPI();
			} catch (error) {
				toast.error('Failed to refresh token after removing user from team');
				console.error('Failed to refresh token after removing user from team:', error);
			}

			// Invalidate queries for cache consistency
			queryClient.invalidateQueries({
				queryKey: queryKeys.organizationTeams.all
			});
		},
		onError: (error) => {
			// Enhanced error handling
			toast.error('Remove user from all teams failed', {
				description: error.message
			});
			console.error('Remove user from all teams failed:', error);
			// Original error will be thrown and handled by calling code
		}
	});

	// /**
	//  * Get active team profile from api
	//  */
	// useEffect(() => {
	// 	if (activeTeamId && firstLoad && user?.employee.organizationId && user?.employee.tenantId) {
	// 		getOrganizationTeamAPI(activeTeamId, user?.employee.organizationId, user?.employee.tenantId).then((res) => {
	// 			!loadingTeamsRef.current && setTeamsUpdate(res.data);
	// 		});
	// 	}
	// }, [
	// 	activeTeamId,
	// 	firstLoad,
	// 	loadingTeamsRef,
	// 	setTeams,
	// 	setTeamsUpdate,
	// 	user?.employee?.organizationId,
	// 	user?.employee?.tenantId
	// ]);

	// editOrganizationTeam - React Query implementation
	const editOrganizationTeam = useCallback(
		(data: Partial<TOrganizationTeam>) => {
			// Use React Query mutation with Promise interface preserved
			return editOrganizationTeamMutation.mutateAsync(data);
		},
		[editOrganizationTeamMutation]
	);

	// deleteOrganizationTeam - React Query implementation
	const deleteOrganizationTeam = useCallback(
		(id: string) => {
			// Use React Query mutation with Promise interface preserved
			return deleteOrganizationTeamMutation.mutateAsync(id);
		},
		[deleteOrganizationTeamMutation]
	);

	// removeUserFromAllTeam - React Query implementation (most complex)
	const removeUserFromAllTeam = useCallback(
		(userId: string) => {
			// Use React Query mutation with Promise interface preserved
			return removeUserFromAllTeamMutation.mutateAsync(userId);
		},
		[removeUserFromAllTeamMutation]
	);

	useEffect(() => {
		if (activeTeam?.projects && activeTeam?.projects?.length) {
			setActiveProjectIdCookie(activeTeam?.projects[0]?.id);
		}
		isManager();
	}, [activeTeam]);

	const handleFirstLoad = useCallback(async () => {
		await loadTeamsData();

		if (activeTeamId && organizationId && tenantId) {
			try {
				const res = await organizationTeamService.getOrganizationTeam(activeTeamId, organizationId, tenantId);
				if (res) {
					setTeamsUpdate(res.data);
				}
			} catch (error) {
				console.error('Error loading team details:', error);
			}
		}

		firstLoadTeamsData();
	}, [activeTeamId, firstLoadTeamsData, loadTeamsData, organizationId, setTeamsUpdate, tenantId]);

	return {
		loadTeamsData,
		getOrganizationTeamsLoading: organizationTeamsQuery.isLoading, // React Query loading state
		teams,
		activeTeam,
		setActiveTeam,
		createOrganizationTeam,
		createOTeamLoading,
		firstLoadTeamsData: handleFirstLoad,
		editOrganizationTeam,
		editOrganizationTeamLoading: editOrganizationTeamMutation.isPending, // React Query loading state
		deleteOrganizationTeam,
		deleteOrganizationTeamLoading: deleteOrganizationTeamMutation.isPending, // React Query loading state
		activeTeamManagers,
		updateOrganizationTeam,
		updateOTeamLoading,
		setTeams,
		isTeamMember,
		isTeamManager,
		removeUserFromAllTeamLoading: removeUserFromAllTeamMutation.isPending, // React Query loading state
		removeUserFromAllTeam,
		loadingTeam: organizationTeamQuery.isLoading, // React Query loading state
		isTrackingEnabled,
		memberActiveTaskId,
		isTeamMemberJustDeleted,
		setIsTeamMemberJustDeleted
	};
}
