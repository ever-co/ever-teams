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
 * @deprecated **DEPRECATED** - This monolithic hook has been split into focused, atomic hooks.
 *
 * This hook is maintained for backward compatibility only. Please migrate to the new hooks
 * for better performance, smaller bundle sizes, and more predictable re-renders.
 *
 * ## Migration Guide
 *
 * ### Queries (Read Operations)
 * | Before (deprecated) | After (recommended) |
 * |---------------------|---------------------|
 * | `const { teams } = useOrganizationTeams()` | `const { teams } = useOrganisationTeams()` |
 * | `const { activeTeam } = useOrganizationTeams()` | `const activeTeam = useCurrentTeam()` |
 * | `const { activeTeamManagers } = useOrganizationTeams()` | `const managers = useActiveTeamManagers()` |
 * | `const { getOrganizationTeamsLoading } = useOrganizationTeams()` | `const { isLoading } = useGetOrganizationTeamsQuery()` |
 * | `const { loadingTeam } = useOrganizationTeams()` | `const { isLoading } = useGetOrganizationTeamQuery()` |
 *
 * ### Mutations (Write Operations)
 * | Before (deprecated) | After (recommended) |
 * |---------------------|---------------------|
 * | `const { createOrganizationTeam } = useOrganizationTeams()` | `const { createOrganizationTeam } = useCreateOrganizationTeam()` |
 * | `const { updateOrganizationTeam } = useOrganizationTeams()` | `const { updateOrganizationTeam } = useUpdateOrganizationTeam()` |
 * | `const { editOrganizationTeamLoading } = useOrganizationTeams()` | `const { isPending } = useEditOrganizationTeamMutation()` |
 * | `const { deleteOrganizationTeamLoading } = useOrganizationTeams()` | `const { isPending, mutateAsync } = useDeleteOrganizationTeamMutation()` |
 * | `const { removeUserFromAllTeamLoading } = useOrganizationTeams()` | `const { isPending, mutateAsync } = useRemoveUserFromAllTeamMutation()` |
 *
 * ### Actions & Utilities
 * | Before (deprecated) | After (recommended) |
 * |---------------------|---------------------|
 * | `const { setActiveTeam } = useOrganizationTeams()` | `const setActiveTeam = useSetActiveTeam()` |
 * | `const { loadTeamsData } = useOrganizationTeams()` | `const loadTeamsData = useLoadTeamsData()` |
 * | `const { firstLoadTeamsData } = useOrganizationTeams()` | `const loadTeamsData = useLoadTeamsData()` combined with `useFirstLoad()` |
 * | `const { setTeams } = useOrganizationTeams()` | `const { setTeams } = useTeamsState()` |
 *
 * ### State & Computed Values
 * | Before (deprecated) | After (recommended) |
 * |---------------------|---------------------|
 * | `const { isTeamMember } = useOrganizationTeams()` | `const isTeamMember = useAtomValue(isTeamMemberState)` |
 * | `const { isTeamManager } = useOrganizationTeams()` | `const isTeamManager = useAtomValue(isTeamManagerState)` |
 * | `const { isTrackingEnabled } = useOrganizationTeams()` | `const isTrackingEnabled = useAtomValue(isTrackingEnabledState)` |
 * | `const { memberActiveTaskId } = useOrganizationTeams()` | Compute locally or create dedicated hook |
 * | `const { isTeamMemberJustDeleted } = useOrganizationTeams()` | `const [value, setValue] = useAtom(isTeamMemberJustDeletedState)` |
 *
 * ## Usage Examples
 *
 * ### Before (deprecated pattern)
 * ```tsx
 * function MyComponent() {
 *   const {
 *     teams,
 *     activeTeam,
 *     setActiveTeam,
 *     createOrganizationTeam,
 *     deleteOrganizationTeamLoading
 *   } = useOrganizationTeams();
 *
 *   // All properties trigger re-renders even if unused
 * }
 * ```
 *
 * ### After (recommended pattern)
 * ```tsx
 * function MyComponent() {
 *   // Only subscribe to what you need - optimized re-renders!
 *   const { teams } = useOrganisationTeams();
 *   const activeTeam = useCurrentTeam();
 *   const setActiveTeam = useSetActiveTeam();
 *   const { createOrganizationTeam } = useCreateOrganizationTeam();
 *   const { isPending: isDeleting } = useDeleteOrganizationTeamMutation();
 * }
 * ```
 *
 * ### Query with React Query benefits
 * ```tsx
 * function TeamsListComponent() {
 *   const { isLoading, isError, error, refetch } = useGetOrganizationTeamsQuery();
 *   const { teams } = useOrganisationTeams();
 *
 *   if (isLoading) return <Spinner />;
 *   if (isError) return <Error message={error.message} onRetry={refetch} />;
 *
 *   return <TeamsList teams={teams} />;
 * }
 * ```
 *
 * ### Mutation with proper error handling
 * ```tsx
 * function DeleteTeamButton({ teamId }: { teamId: string }) {
 *   const { mutateAsync, isPending, isError } = useDeleteOrganizationTeamMutation();
 *
 *   const handleDelete = async () => {
 *     try {
 *       await mutateAsync(teamId);
 *       toast.success('Team deleted successfully');
 *     } catch (error) {
 *       toast.error('Failed to delete team');
 *     }
 *   };
 *
 *   return (
 *     <Button onClick={handleDelete} disabled={isPending}>
 *       {isPending ? 'Deleting...' : 'Delete Team'}
 *     </Button>
 *   );
 * }
 * ```
 *
 * @see {@link useOrganisationTeams} - Access organization teams list (synced with React Query)
 * @see {@link useCurrentTeam} - Access currently active team (synced with React Query)
 * @see {@link useActiveTeamManagers} - Access managers of the active team
 * @see {@link useGetOrganizationTeamsQuery} - React Query hook for fetching teams list
 * @see {@link useGetOrganizationTeamQuery} - React Query hook for fetching single team details
 * @see {@link useCreateOrganizationTeam} - Hook for creating a new team
 * @see {@link useUpdateOrganizationTeam} - Hook for updating team details
 * @see {@link useEditOrganizationTeamMutation} - React Query mutation for editing team
 * @see {@link useDeleteOrganizationTeamMutation} - React Query mutation for deleting team
 * @see {@link useRemoveUserFromAllTeamMutation} - React Query mutation for removing user from all teams
 * @see {@link useSetActiveTeam} - Hook for setting the active team
 * @see {@link useLoadTeamsData} - Hook for loading/refreshing teams data
 * @see {@link useTeamsState} - Hook for direct teams state manipulation
 *
 * @returns {Object} Legacy object containing all team-related properties and methods
 *
 * @example
 * // ⚠️ Deprecated usage - avoid in new code
 * const { teams, activeTeam, setActiveTeam } = useOrganizationTeams();
 *
 * // ✅ Recommended - use individual hooks
 * const { teams } = useOrganisationTeams();
 * const activeTeam = useCurrentTeam();
 * const setActiveTeam = useSetActiveTeam();
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
