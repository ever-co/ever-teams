'use client';

/**
 * @deprecated This hook re-exports from specialized hooks for backward compatibility.
 * For new code, prefer using the specific hooks directly:
 * - `useOrganizationTeamsQuery` for read operations
 * - `useCreateOrganizationTeam` for team creation
 * - `useUpdateOrganizationTeam` for team updates
 * - `useEditOrganizationTeam` for team edits
 * - `useDeleteOrganizationTeam` for team deletion
 */

import { setActiveProjectIdCookie } from '@/core/lib/helpers/cookies';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import {
	activeTeamManagersState,
	activeTeamState,
	isTeamManagerState,
	isTeamMemberState,
	isTrackingEnabledState,
	memberActiveTaskIdState,
	organizationTeamsState,
	timerStatusState
} from '@/core/stores';
import { useCallback, useEffect, useMemo } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';

// Import specialized hooks
import { useOrganizationTeamsQuery } from './use-organization-teams-query';
import { useCreateOrganizationTeam } from './use-create-organization-team';
import { useUpdateOrganizationTeam } from './use-update-organization-team';
import { useEditOrganizationTeam } from './use-edit-organization-team';
import { useDeleteOrganizationTeam } from './use-delete-organization-team';

/**
 * @deprecated Use specialized hooks instead:
 * - `useOrganizationTeamsQuery` for read operations
 * - `useCreateOrganizationTeam` for team creation
 * - `useUpdateOrganizationTeam` for team updates
 * - `useEditOrganizationTeam` for team edits
 * - `useDeleteOrganizationTeam` for team deletion
 */
export function useOrganizationTeams() {
	const { data: user } = useUserQuery();
	const [teams, setTeams] = useAtom(organizationTeamsState);
	const activeTeam = useAtomValue(activeTeamState);
	const activeTeamManagers = useAtomValue(activeTeamManagersState);
	const timerStatus = useAtomValue(timerStatusState);
	const [isTeamMember] = useAtom(isTeamMemberState);
	const [isTeamManager, setIsTeamManager] = useAtom(isTeamManagerState);
	const setIsTrackingEnabledState = useSetAtom(isTrackingEnabledState);

	// ==================== SPECIALIZED HOOKS ====================

	const {
		getOrganizationTeamsLoading,
		loadingTeam,
		loadTeamsData,
		firstLoadTeamsData,
		isTeamMemberJustDeleted,
		setIsTeamMemberJustDeleted
	} = useOrganizationTeamsQuery();

	const { createOrganizationTeam, setActiveTeam, loading: createOTeamLoading } = useCreateOrganizationTeam();

	const { updateOrganizationTeam, loading: updateOTeamLoading } = useUpdateOrganizationTeam();

	const { editOrganizationTeam, editOrganizationTeamLoading } = useEditOrganizationTeam();

	const {
		deleteOrganizationTeam,
		deleteOrganizationTeamLoading,
		removeUserFromAllTeam,
		removeUserFromAllTeamLoading
	} = useDeleteOrganizationTeam();

	// ==================== DERIVED STATE ====================

	const members = useMemo(() => activeTeam?.members || [], [activeTeam?.members]);
	const currentUser = members.find((member) => member.employee?.userId === user?.id);

	const memberActiveTaskId =
		(timerStatus?.running && timerStatus?.lastLog?.taskId) || currentUser?.activeTaskId || null;

	const isTrackingEnabled = activeTeam?.members?.find(
		(member) => member.employee?.userId === user?.id && member.isTrackingEnabled
	)
		? true
		: false;

	// Sync memberActiveTaskId to global atom for use by other hooks (e.g., use-team-tasks.ts)
	const setMemberActiveTaskId = useSetAtom(memberActiveTaskIdState);
	useEffect(() => {
		setMemberActiveTaskId(memberActiveTaskId);
	}, [memberActiveTaskId, setMemberActiveTaskId]);

	// ==================== SIDE EFFECTS ====================

	useEffect(() => {
		if (activeTeam?.projects && activeTeam?.projects?.length) {
			setActiveProjectIdCookie(activeTeam?.projects[0]?.id);
		}
		setIsTrackingEnabledState(isTrackingEnabled);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeTeam]);

	// ==================== RETURN ALL PROPERTIES (BACKWARD COMPATIBILITY) ====================

	return {
		// Query operations (from useOrganizationTeamsQuery)
		loadTeamsData,
		getOrganizationTeamsLoading,
		loadingTeam,
		firstLoadTeamsData,

		// State (from Jotai)
		teams,
		activeTeam,
		setActiveTeam,
		setTeams,
		activeTeamManagers,

		// Create operations (from useCreateOrganizationTeam)
		createOrganizationTeam,
		createOTeamLoading,

		// Update operations (from useUpdateOrganizationTeam)
		updateOrganizationTeam,
		updateOTeamLoading,

		// Edit operations (from useEditOrganizationTeam)
		editOrganizationTeam,
		editOrganizationTeamLoading,

		// Delete operations (from useDeleteOrganizationTeam)
		deleteOrganizationTeam,
		deleteOrganizationTeamLoading,
		removeUserFromAllTeam,
		removeUserFromAllTeamLoading,

		// Derived state
		isTeamMember,
		isTeamManager,
		isTrackingEnabled,
		memberActiveTaskId,
		isTeamMemberJustDeleted,
		setIsTeamMemberJustDeleted
	};
}
