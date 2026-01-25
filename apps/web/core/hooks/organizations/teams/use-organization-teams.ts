'use client';
import { setActiveProjectIdCookie } from '@/core/lib/helpers/cookies';

import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { organizationTeamService } from '@/core/services/client/api/organizations/teams';
import {
	activeTeamIdState,
	isTeamManagerState,
	isTeamMemberJustDeletedState,
	isTeamMemberState,
	isTrackingEnabledState,
	organizationTeamsState,
	timerStatusState
} from '@/core/stores';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useEffect, useMemo } from 'react';
import { useFirstLoad } from '../../common';
import { useActiveTeamManagers } from './use-active-team-managers';
import { useCreateOrganizationTeam } from './use-create-organization-team';
import { useCurrentTeam } from './use-current-team';
import { useTeamsState } from './use-teams-state';
import { useUpdateOrganizationTeam } from './use-update-organization-team';
import { useOrganisationTeams } from './use-organisation-teams';
import { useEditOrganizationTeamMutation } from './use-edit-organization-team-mutation';
import { useGetOrganizationTeamQuery, useGetOrganizationTeamsQuery } from './use-get-organization-teams-query';
import { useLoadTeamsData } from './use-load-teams-data';
import { useDeleteOrganizationTeamMutation } from './use-delete-organization-team-mutation';
import { useRemoveUserFromAllTeamMutation } from './use-remove-user-from-all-team-mutation';
import { useSetActiveTeam } from './use-set-active-team';

/**
 * A powerful hook for managing organization teams with complete CRUD operations and state management.
 * This hook centralizes all team-related operations and states in one place.
 *
 * Keep for backward compatibility
 * @deprecated this monolithic hook has been splitted into small hooks `useEditOrganizationTeamMutation()`, `useGetOrganizationTeamsQuery()`, `useGetOrganizationTeamQuery()`, `useGetOrganizationTeamById()`, `useDeleteOrganizationTeamMutation()`, `useLoadTeamsData()`, `useSetActiveTeam()`, `useCurrentTeam()`, `useOrganisationTeams()`, `useRemoveUserFromAllTeamMutation()`,
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
	const [, setTeams] = useAtom(organizationTeamsState);
	const { teams } = useOrganisationTeams();

	const { setTeamsUpdate } = useTeamsState();
	const activeTeam = useCurrentTeam();

	const { managers: activeTeamManagers } = useActiveTeamManagers();

	// ===== React Query mutations for complex operations =====
	// editOrganizationTeam - React Query implementation
	const editOrganizationTeamMutation = useEditOrganizationTeamMutation();

	const [activeTeamId] = useAtom(activeTeamIdState);
	const [isTeamMemberJustDeleted, setIsTeamMemberJustDeleted] = useAtom(isTeamMemberJustDeletedState);
	const { firstLoadData: firstLoadTeamsData } = useFirstLoad();
	const [isTeamMember] = useAtom(isTeamMemberState);
	const { data: user } = useUserQuery();
	const timerStatus = useAtomValue(timerStatusState);
	const setIsTrackingEnabledState = useSetAtom(isTrackingEnabledState);

	const [isTeamManager, setIsTeamManager] = useAtom(isTeamManagerState);

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
	const organizationTeamsQuery = useGetOrganizationTeamsQuery();

	// Query for specific team details
	const organizationTeamQuery = useGetOrganizationTeamQuery();

	// ===== SYNCHRONIZATION WITH JOTAI (Backward Compatibility) =====
	// NOTE: SYNCHRONIZATION is done in useGetOrganizationTeamsQuery
	// NOTE: SYNCHRONIZATION is done in useGetOrganizationTeamQuery

	// ===== LEGACY HOOKS FOR MUTATIONS & CREATION (Phase 2 & 3) =====
	const { createOrganizationTeam, loading: createOTeamLoading } = useCreateOrganizationTeam();
	const setActiveTeam = useSetActiveTeam();
	const { updateOrganizationTeam, loading: updateOTeamLoading } = useUpdateOrganizationTeam();

	const isManager = useCallback(() => {
		const $u = user;
		const isM = members.find((member) => {
			const isUser = member.employee?.userId === $u?.id;
			return isUser && member.role && member.role.name === 'MANAGER';
		});
		setIsTeamManager(!!isM);
	}, [user, members]);

	// ===== BACKWARD COMPATIBLE FUNCTIONS =====

	const loadTeamsData = useLoadTeamsData();

	// deleteOrganizationTeam - React Query implementation (after loadTeamsData definition)
	const deleteOrganizationTeamMutation = useDeleteOrganizationTeamMutation();

	// removeUserFromAllTeam - React Query implementation (most complex with auth side-effects)
	const removeUserFromAllTeamMutation = useRemoveUserFromAllTeamMutation();

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

	useEffect(() => {
		if (activeTeam?.projects && activeTeam?.projects?.length) {
			setActiveProjectIdCookie(activeTeam?.projects[0]?.id);
		}
		setIsTrackingEnabledState(isTrackingEnabled);
		isManager();
	}, [activeTeam]);

	const handleFirstLoad = useCallback(async () => {
		await loadTeamsData();

		if (activeTeamId) {
			try {
				const res = await organizationTeamService.getOrganizationTeam(activeTeamId);
				if (res) {
					setTeamsUpdate(res.data);
				}
			} catch (error) {
				console.error('Error loading team details:', error);
			}
		}

		firstLoadTeamsData();
	}, [activeTeamId, firstLoadTeamsData, loadTeamsData, setTeamsUpdate]);

	return {
		loadTeamsData,
		getOrganizationTeamsLoading: organizationTeamsQuery.isLoading, // React Query loading state
		teams,
		activeTeam,
		setActiveTeam,
		createOrganizationTeam,
		createOTeamLoading,
		firstLoadTeamsData: handleFirstLoad,
		editOrganizationTeamLoading: editOrganizationTeamMutation.isPending, // React Query loading state
		deleteOrganizationTeamLoading: deleteOrganizationTeamMutation.isPending, // React Query loading state
		activeTeamManagers,
		updateOrganizationTeam,
		updateOTeamLoading,
		setTeams,
		isTeamMember,
		isTeamManager,
		removeUserFromAllTeamLoading: removeUserFromAllTeamMutation.isPending, // React Query loading state
		loadingTeam: organizationTeamQuery.isLoading, // React Query loading state
		isTrackingEnabled,
		memberActiveTaskId,
		isTeamMemberJustDeleted,
		setIsTeamMemberJustDeleted
	};
}
