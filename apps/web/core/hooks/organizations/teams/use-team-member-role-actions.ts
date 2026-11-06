'use client';
import { useCallback } from 'react';
import { useGetActiveTeam } from './use-get-active-team';
import { useUpdateOrganizationTeam } from './use-update-organization-team';
import { useDeleteTask } from './use-delete-task';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { isTeamManagerMember } from '@/core/stores/teams/organization-team';
import { employeeIdOf, rosterWithRole, rosterWithout, teamRosterOf } from '@/core/lib/utils/settings-team';

/**
 * Provides role management and team membership actions for a given team member.
 *
 * Handles:
 * - makeMemberManager: promotes the member to manager role
 * - unMakeMemberManager: demotes the member from manager role
 * - removeMemberFromTeam: removes the member from the team and deletes their task assignments
 * - updateOTeamLoading: loading state for team update operations
 *
 * Reads the active team when an action runs, so a member row does not re-render on every team refresh.
 * Every action sends the whole roster, built like the team settings build it: employee ids, and every manager,
 * flagged or by role. A manager left out of the list loses the team's management when the team is saved.
 *
 * @param member - The team member to manage roles for
 */
export function useTeamMemberRoleActions(member: TOrganizationTeamEmployee | undefined) {
	const getActiveTeam = useGetActiveTeam();
	const { updateOrganizationTeam, loading: updateOTeamLoading } = useUpdateOrganizationTeam();
	const { deleteEmployeeFromTasks } = useDeleteTask();

	/**
	 * Give the manager role to the member
	 */
	const makeMemberManager = useCallback(() => {
		const employeeId = member ? employeeIdOf(member) : null;

		const team = getActiveTeam();
		if (!team || !employeeId) return;

		const roster = teamRosterOf(team.members ?? [], isTeamManagerMember);
		updateOrganizationTeam(team, rosterWithRole(roster, employeeId, 'manager'));
	}, [updateOrganizationTeam, member, getActiveTeam]);

	/**
	 * Remove manager role from the member
	 */
	const unMakeMemberManager = useCallback(() => {
		const employeeId = member ? employeeIdOf(member) : null;

		const team = getActiveTeam();
		if (!team || !employeeId) return;

		const roster = teamRosterOf(team.members ?? [], isTeamManagerMember);
		updateOrganizationTeam(team, rosterWithRole(roster, employeeId, 'member'));
	}, [updateOrganizationTeam, member, getActiveTeam]);

	/**
	 * Remove member from team and delete their task assignments
	 */
	const removeMemberFromTeam = useCallback(() => {
		const employeeId = member ? employeeIdOf(member) : null;
		const team = getActiveTeam();
		if (!team || !employeeId) return;

		const roster = teamRosterOf(team.members ?? [], isTeamManagerMember);
		deleteEmployeeFromTasks(employeeId).catch(console.error);
		updateOrganizationTeam(team, rosterWithout(roster, employeeId));
	}, [updateOrganizationTeam, member, getActiveTeam, deleteEmployeeFromTasks]);

	return {
		makeMemberManager,
		unMakeMemberManager,
		removeMemberFromTeam,
		updateOTeamLoading
	};
}

export type I_TeamMemberRoleActionsHook = ReturnType<typeof useTeamMemberRoleActions>;
