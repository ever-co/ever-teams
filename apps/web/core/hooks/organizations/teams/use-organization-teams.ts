'use client';
import {
	getActiveTeamIdCookie,
	getOrganizationIdCookie,
	getTenantIdCookie,
	setActiveProjectIdCookie,
	setActiveTeamIdCookie,
	setOrganizationIdCookie
} from '@/core/lib/helpers/cookies';
import { TOrganizationTeam } from '@/core/types/schemas';
import {
	activeTeamIdState,
	activeTeamManagersState,
	activeTeamState,
	isTeamMemberJustDeletedState,
	isTeamMemberState,
	organizationTeamsState,
	timerStatusState
} from '@/core/stores';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import isEqual from 'lodash/isEqual';
import { LAST_WORSPACE_AND_TEAM } from '@/core/constants/config/constants';
import { organizationTeamService } from '@/core/services/client/api/organizations/teams';
import { useFirstLoad, useSyncRef } from '../../common';
import { useAuthenticateUser } from '../../auth';
import { useSettings } from '../../users';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { toast } from 'sonner';

/**
 * It updates the `teams` state with the `members` status from the `team` status API
 * @returns An object with three properties:
 * teams: The current value of the teams state.
 * setTeams: A function that can be used to update the teams state.
 * setTeamUpdate: A function that can be used to update the teams state.
 */
function useTeamsState() {
	const [teams, setTeams] = useAtom(organizationTeamsState);
	const teamsRef = useSyncRef(teams);

	const setTeamsUpdate = useCallback(
		(team: TOrganizationTeam) => {
			// Update active teams fields with from team Status API
			setTeams((tms) => {
				return [...tms.filter((t) => t.id != team.id), team];
			});
		},
		[setTeams]
	);

	return {
		teams,
		setTeams,
		setTeamsUpdate,
		teamsRef
	};
}

/**
 * Create Organization Team
 * Migrated from useQueryCall to useMutation for better performance and cache management
 */
function useCreateOrganizationTeam() {
	const [teams, setTeams] = useAtom(organizationTeamsState);
	const teamsRef = useSyncRef(teams);
	const setActiveTeamId = useSetAtom(activeTeamIdState);
	const { refreshToken, $user } = useAuthenticateUser();
	const [isTeamMember, setIsTeamMember] = useAtom(isTeamMemberState);
	const queryClient = useQueryClient();

	const createTeamMutation = useMutation({
		mutationFn: async (params: { name: string; user: any }) => {
			return organizationTeamService.createOrganizationTeam(params.name, params.user);
		},
		mutationKey: queryKeys.organizationTeams.mutations.create(undefined),
		onSuccess: async (res, variables) => {
			// Invalidate and refetch teams after creation
			await queryClient.invalidateQueries({
				queryKey: queryKeys.organizationTeams.all
			});

			const dt = res.data?.items || [];
			setTeams(dt);
			const created = dt.find((t: TOrganizationTeam) => t.name === variables.name);

			if (created) {
				setActiveTeamIdCookie(created.id);
				setOrganizationIdCookie(created.organizationId || '');
				setActiveTeamId(created.id);

				if (!isTeamMember) {
					setIsTeamMember(true);
				}

				/**
				 * DO NOT REMOVE
				 * Refresh Token needed for the first time when new Organization is created,
				 * As in backend permissions are getting updated
				 */
				queryClient.invalidateQueries({
					queryKey: queryKeys.organizationTeams.all
				});
				toast.success('Organization team created successfully', {
					description: 'You can now start using your new team'
				});
				await refreshToken();
			}
		},
		onError: (error) => {
			toast.error('Create organization team failed:', { description: error.message });
		}
	});

	const createOrganizationTeam = useCallback(
		(name: string) => {
			const teams = teamsRef.current;
			const $name = name.trim();
			const exits = teams.find((t: TOrganizationTeam) => t.name.toLowerCase() === $name.toLowerCase());

			if (exits || $name.length < 2 || !$user.current) {
				return Promise.reject(new Error('Invalid team name !'));
			}

			// Use mutateAsync for Promise-based API
			return createTeamMutation.mutateAsync({ name: $name, user: $user.current });
		},
		[createTeamMutation, teamsRef, $user]
	);

	return {
		createOrganizationTeam,
		loading: createTeamMutation.isPending
	};
}

/**
 * Update Organization Team
 * Migrated from useQueryCall to useMutation for better performance and cache management
 */
function useUpdateOrganizationTeam() {
	const { setTeamsUpdate } = useTeamsState();
	const queryClient = useQueryClient();

	const updateTeamMutation = useMutation({
		mutationFn: async (params: { teamId: string; data: Partial<TOrganizationTeam> }) => {
			return organizationTeamService.updateOrganizationTeam(params.teamId, params.data);
		},
		mutationKey: queryKeys.organizationTeams.mutations.update(undefined),
		onSuccess: (res, variables) => {
			// Update team state with new data
			setTeamsUpdate(res.data);

			// Invalidate relevant queries
			queryClient.invalidateQueries({
				queryKey: queryKeys.organizationTeams.detail(variables.teamId)
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.organizationTeams.all
			});
			toast.success('Organization team updated successfully', {
				description: 'Your team has been updated successfully'
			});
		},
		onError: (error) => {
			toast.error('Update organization team failed:', { description: error.message });
		}
	});

	const updateOrganizationTeam = useCallback(
		(team: TOrganizationTeam, data: Partial<TOrganizationTeam> = {}) => {
			const members = team.members;

			const body: Partial<TOrganizationTeam> = {
				id: team.id,
				memberIds: members
					?.map((t) => t.employee?.id || '')
					.filter((value, index, array) => array.indexOf(value) === index), // To make the array Unique list of ids
				managerIds: members
					?.filter((m) => m.role && m.role.name === 'MANAGER')
					.map((t) => t.employee?.id || '')
					.filter((value, index, array) => array.indexOf(value) === index), // To make the array Unique list of ids
				name: team.name,
				tenantId: team.tenantId!,
				organizationId: team.organizationId!,
				tags: [],
				...data
			};

			// Return Promise for backward compatibility
			return updateTeamMutation.mutateAsync({ teamId: team.id, data: body });
		},
		[updateTeamMutation]
	);

	return {
		updateOrganizationTeam,
		loading: updateTeamMutation.isPending
	};
}

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
 * @property {TOrganizationTeam[]} teams
 * Array containing all teams in the organization. Each team includes:
 * - Team details (id, name, etc.)
 * - Member information
 * - Projects associated
 * - Roles and permissions
 *
 * @property {boolean} teamsFetching
 * Specific loading state for team fetching operations
 *
 * @property {TOrganizationTeam} activeTeam
 * Currently selected team with all its details
 *
 * @property {(team: TOrganizationTeam) => void} setActiveTeam
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
 * @property {(data: Partial<TOrganizationTeam>) => Promise<any>} editOrganizationTeam
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
 * @property {any[]} activeTeamManagers
 * List of managers for the active team with their roles and permissions
 *
 * @property {(team: TOrganizationTeam, data?: Partial<TOrganizationTeam>) => void} updateOrganizationTeam
 * Updates team details with partial data support
 *
 * @property {boolean} updateOTeamLoading
 * Loading state for team updates
 *
 * @property {(teams: TOrganizationTeam[]) => void} setTeams
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
	const { teams, setTeams, setTeamsUpdate, teamsRef } = useTeamsState();
	const activeTeam = useAtomValue(activeTeamState);
	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();
	const queryClient = useQueryClient();

	const activeTeamManagers = useAtomValue(activeTeamManagersState);

	const [activeTeamId, setActiveTeamId] = useAtom(activeTeamIdState);
	const [isTeamMemberJustDeleted, setIsTeamMemberJustDeleted] = useAtom(isTeamMemberJustDeletedState);
	const { firstLoadData: firstLoadTeamsData } = useFirstLoad();
	const [isTeamMember, setIsTeamMember] = useAtom(isTeamMemberState);
	const { updateUserFromAPI, refreshToken, user } = useAuthenticateUser();
	const { updateAvatar: updateUserLastTeam } = useSettings();
	const timerStatus = useAtomValue(timerStatusState);

	const [isTeamManager, setIsTeamManager] = useState(false);

	// React Query for organization teams (GET operations)
	const organizationTeamsQuery = useQuery({
		queryKey: queryKeys.organizationTeams.paginated({
			organizationId: organizationId || '',
			tenantId: tenantId || ''
		}),
		queryFn: async () => {
			if (!organizationId || !tenantId) {
				throw new Error('Organization ID and Tenant ID are required');
			}
			return organizationTeamService.getOrganizationTeams(organizationId, tenantId);
		},
		enabled: !!organizationId && !!tenantId,
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 15 // 15 minutes
	});

	// React Query for single organization team (GET operations)
	const organizationTeamQuery = useQuery({
		queryKey: queryKeys.organizationTeams.detail(activeTeamId),
		queryFn: async () => {
			if (!activeTeamId || !organizationId || !tenantId) {
				throw new Error('Team ID, Organization ID and Tenant ID are required');
			}
			return organizationTeamService.getOrganizationTeam(activeTeamId, organizationId, tenantId);
		},
		enabled: !!activeTeamId && !!organizationId && !!tenantId,
		staleTime: 1000 * 60 * 2, // 2 minutes - more volatile data
		gcTime: 1000 * 60 * 10 // 10 minutes
	});

	// Sync React Query data with Jotai state for backward compatibility
	useEffect(() => {
		if (organizationTeamsQuery.data?.data?.items) {
			const latestTeams = organizationTeamsQuery.data.data.items;
			const latestTeamsSorted = latestTeams
				.slice()
				.sort((a: TOrganizationTeam, b: TOrganizationTeam) => a.name.localeCompare(b.name));
			const teamsRefSorted = teamsRef.current.slice().sort((a, b) => a.name.localeCompare(b.name));

			// Only update if there are actual changes to prevent unnecessary re-renders
			if (!isEqual(latestTeamsSorted, teamsRefSorted)) {
				setTeams(latestTeamsSorted);
			}
		}
	}, [organizationTeamsQuery.data, setTeams]); // Removed teamsRef from deps to prevent infinite loops

	// Sync single team data with Jotai state
	useEffect(() => {
		if (organizationTeamQuery.data?.data) {
			const newTeam = organizationTeamQuery.data.data;
			const currentTeams = teamsRef.current;

			// Update teams list with the new team data
			if (newTeam && currentTeams.length > 0) {
				const updatedTeams: TOrganizationTeam[] = [
					newTeam,
					...currentTeams.filter((team: TOrganizationTeam) => team.id !== newTeam.id)
				];
				setTeams(updatedTeams);
			}
		}
	}, [organizationTeamQuery.data, setTeams]); // Removed teamsRef from deps to prevent infinite loops

	const members = useMemo(() => activeTeam?.members || [], [activeTeam?.members]);
	const currentUser = members.find((member) => member.employee?.userId === user?.id);

	const memberActiveTaskId =
		(timerStatus?.running && timerStatus?.lastLog?.taskId) || currentUser?.activeTaskId || null;

	const isTrackingEnabled = activeTeam?.members?.find(
		(member) => member.employee?.userId === user?.id && member.isTrackingEnabled
	)
		? true
		: false;

	// REACT QUERY MUTATIONS - Team CRUD operations
	const { createOrganizationTeam, loading: createOTeamLoading } = useCreateOrganizationTeam();
	const { updateOrganizationTeam, loading: updateOTeamLoading } = useUpdateOrganizationTeam();

	// Edit organization team mutation
	const editTeamMutation = useMutation({
		mutationFn: async (data: Partial<TOrganizationTeam>) => {
			return organizationTeamService.editOrganizationTeam(data);
		},
		mutationKey: queryKeys.organizationTeams.mutations.edit(undefined),
		onSuccess: (res) => {
			setTeamsUpdate(res.data);
			// Invalidate relevant queries
			queryClient.invalidateQueries({
				queryKey: queryKeys.organizationTeams.detail(res.data.id)
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.organizationTeams.all
			});
		},
		onError: (error) => {
			toast.error('Edit organization team failed:', { description: error.message });
		}
	});

	// Delete organization team mutation
	const deleteTeamMutation = useMutation({
		mutationFn: async (teamId: string) => {
			return organizationTeamService.deleteOrganizationTeam(teamId);
		},
		mutationKey: queryKeys.organizationTeams.mutations.delete(undefined),
		onSuccess: () => {
			// Invalidate and refetch teams data after deletion
			queryClient.invalidateQueries({
				queryKey: queryKeys.organizationTeams.all
			});
			toast.success('Organization team deleted successfully', {
				description: 'Your team has been deleted successfully'
			});
		},
		onError: (error) => {
			toast.error('Delete organization team failed:', { description: error.message });
		}
	});

	// Remove user from all teams mutation
	const removeUserMutation = useMutation({
		mutationFn: async (userId: string) => {
			return organizationTeamService.removeUserFromAllTeams(userId);
		},
		mutationKey: queryKeys.organizationTeams.mutations.removeUser(undefined),
		onSuccess: () => {
			// Invalidate and refetch teams data after user removal
			queryClient.invalidateQueries({
				queryKey: queryKeys.organizationTeams.all
			});

			// Handle authentication and user data refresh
			refreshToken().then(() => {
				updateUserFromAPI();
			});
			toast.success('User removed from all teams successfully', {
				description: 'You have been removed from all teams'
			});
		},
		onError: (error) => {
			toast.error('Remove user from all teams failed:', { description: error.message });
		}
	});

	const isManager = useCallback(() => {
		const $u = user;
		const isM = members.find((member) => {
			const isUser = member.employee?.userId === $u?.id;
			return isUser && member.role && member.role.name === 'MANAGER';
		});
		setIsTeamManager(!!isM);
	}, [user, members]);

	const setActiveTeam = useCallback(
		(team: TOrganizationTeam) => {
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

	// Backward compatible loadTeamsData using React Query best practices
	const loadTeamsData = useCallback(async () => {
		if (
			organizationTeamsQuery.isLoading ||
			organizationTeamQuery.isLoading ||
			!user?.employee?.organizationId ||
			!user?.employee?.tenantId
		) {
			return;
		}

		// Ensure we have the required values (handle null values)
		const orgId = user.employee.organizationId;
		const tenId = user.employee.tenantId;

		if (!orgId || !tenId) {
			return;
		}

		// Use fetchQuery to get fresh data immediately (preserves original behavior)
		const teamsResult = await queryClient.fetchQuery({
			queryKey: queryKeys.organizationTeams.paginated({
				organizationId: orgId,
				tenantId: tenId
			}),
			queryFn: async () => {
				return organizationTeamService.getOrganizationTeams(orgId, tenId);
			}
		});

		if (teamsResult?.data?.items) {
			const latestTeams = teamsResult.data.items;

			if (latestTeams.length === 0) {
				setIsTeamMember(false);
				setIsTeamMemberJustDeleted(true);
				return teamsResult;
			}

			let teamId = getActiveTeamIdCookie();
			setActiveTeamId(teamId);

			// Handle case where user might Remove Account from all teams
			if (!latestTeams.find((team: TOrganizationTeam) => team.id === teamId) && latestTeams.length) {
				setIsTeamMemberJustDeleted(true);
				setActiveTeam(latestTeams[0]);
			} else if (!latestTeams.length) {
				teamId = '';
			}

			// Invalidate single team query if we have a team ID
			if (teamId) {
				await queryClient.invalidateQueries({
					queryKey: queryKeys.organizationTeams.detail(teamId)
				});
			}
		}

		return teamsResult;
	}, [
		organizationTeamsQuery.isLoading,
		organizationTeamsQuery.data,
		organizationTeamQuery.isLoading,
		user?.employee?.organizationId,
		user?.employee?.tenantId,
		queryClient,
		setActiveTeam,
		setActiveTeamId,
		setIsTeamMember,
		setIsTeamMemberJustDeleted
	]);

	// Wrapper functions for backward compatibility with mutation promises
	const editOrganizationTeam = useCallback(
		(data: Partial<TOrganizationTeam>) => {
			// Use mutateAsync for Promise-based API compatibility
			return editTeamMutation.mutateAsync(data);
		},
		[editTeamMutation]
	);

	const deleteOrganizationTeam = useCallback(
		(id: string) => {
			// Use mutateAsync for Promise-based API compatibility
			return deleteTeamMutation.mutateAsync(id).then((res) => {
				// Additional operations after deletion if needed
				loadTeamsData();
				return res;
			});
		},
		[deleteTeamMutation, loadTeamsData]
	);

	const removeUserFromAllTeam = useCallback(
		(userId: string) => {
			// Use mutateAsync for Promise-based API compatibility
			return removeUserMutation.mutateAsync(userId).then((res) => {
				// Additional operations after user removal if needed
				loadTeamsData();
				return res;
			});
		},
		[removeUserMutation, loadTeamsData]
	);

	useEffect(() => {
		if (activeTeam?.projects && activeTeam?.projects?.length) {
			setActiveProjectIdCookie(activeTeam?.projects[0]?.id);
		}
		isManager();
	}, [activeTeam, isManager]);

	const handleFirstLoad = useCallback(async () => {
		await loadTeamsData();

		if (activeTeamId && organizationId && tenantId) {
			const res = await organizationTeamService.getOrganizationTeam(activeTeamId, organizationId, tenantId);

			if (res) {
				setTeamsUpdate(res.data);
			}
		}

		firstLoadTeamsData();
	}, [activeTeamId, firstLoadTeamsData, loadTeamsData, organizationId, setTeamsUpdate, tenantId]);

	return {
		loadTeamsData,
		getOrganizationTeamsLoading: organizationTeamsQuery.isLoading,
		teams,
		activeTeam,
		setActiveTeam,
		createOrganizationTeam,
		createOTeamLoading,
		firstLoadTeamsData: handleFirstLoad,
		editOrganizationTeam,
		editOrganizationTeamLoading: editTeamMutation.isPending,
		deleteOrganizationTeam,
		deleteOrganizationTeamLoading: deleteTeamMutation.isPending,
		activeTeamManagers,
		updateOrganizationTeam,
		updateOTeamLoading,
		setTeams,
		isTeamMember,
		isTeamManager,
		removeUserFromAllTeamLoading: removeUserMutation.isPending,
		removeUserFromAllTeamQueryCall: removeUserMutation.mutateAsync,
		removeUserFromAllTeam,
		loadingTeam: organizationTeamQuery.isLoading,
		isTrackingEnabled,
		memberActiveTaskId,
		isTeamMemberJustDeleted,
		setIsTeamMemberJustDeleted
	};
}
