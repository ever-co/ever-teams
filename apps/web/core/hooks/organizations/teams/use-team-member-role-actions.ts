'use client';
import { activeTeamState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { useSyncRef } from '../../common/use-sync-ref';
import { useUpdateOrganizationTeam } from './use-update-organization-team';
import { useDeleteTask } from './use-delete-task';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { ERoleName } from '@/core/types/generics/enums/role';

/**
 * Provides role management and team membership actions for a given team member.
 *
 * Handles:
 * - makeMemberManager: promotes the member to manager role
 * - unMakeMemberManager: demotes the member from manager role
 * - removeMemberFromTeam: removes the member from the team and deletes their task assignments
 * - updateOTeamLoading: loading state for team update operations
 *
 * Uses activeTeamRef (via useSyncRef) to avoid stale closures in callbacks.
 *
 * @param member - The team member to manage roles for
 */
export function useTeamMemberRoleActions(member: TOrganizationTeamEmployee | undefined) {
	const activeTeam = useAtomValue(activeTeamState);
	const activeTeamRef = useSyncRef(activeTeam);
	const { updateOrganizationTeam, loading: updateOTeamLoading } = useUpdateOrganizationTeam();
	const { deleteEmployeeFromTasks } = useDeleteTask();

	/**
	 * Give the manager role to the member
	 */
	const makeMemberManager = useCallback(() => {
		const employeeId = member?.employee?.id;

		if (!activeTeamRef.current || !employeeId) return;

		const team = activeTeamRef.current;
		const managerIdSet = new Set<string>();
		const memberIdSet = new Set<string>();

		for (const m of team.members || []) {
			if (m.employee?.id && m.role?.name === ERoleName.MANAGER) {
				managerIdSet.add(m.employee.id);
			} else if (m.employee?.id) {
				memberIdSet.add(m.employee.id);
			}
		}

		managerIdSet.add(employeeId); // add new employeeId if not already present

		updateOrganizationTeam(team, {
			managerIds: Array.from(managerIdSet),
			memberIds: Array.from(memberIdSet)
		});
	}, [updateOrganizationTeam, member, activeTeamRef]);

	/**
	 * Remove manager role from the member
	 */
	const unMakeMemberManager = useCallback(() => {
		const employeeId = member?.employee?.id;

		if (!activeTeamRef.current || !employeeId) return;

		const team = activeTeamRef.current;
		const managerIdSet = new Set<string>();
		const memberIdSet = new Set<string>();

		for (const m of team.members || []) {
			if (m.employee?.id && m.employee.id !== employeeId && m.role?.name === ERoleName.MANAGER) {
				managerIdSet.add(m.employee.id);
			} else if (m.employee?.id) {
				memberIdSet.add(m.employee.id);
			}
		}

		updateOrganizationTeam(team, {
			managerIds: Array.from(managerIdSet),
			memberIds: Array.from(memberIdSet)
		});
	}, [updateOrganizationTeam, member, activeTeamRef]);

	/**
	 * Remove member from team and delete their task assignments
	 */
	const removeMemberFromTeam = useCallback(() => {
		const employeeId = member?.employee?.id;
		if (!activeTeamRef.current || !employeeId) return;

		const team = activeTeamRef.current;
		const memberIdSet = new Set<string>();
		const managerIdSet = new Set<string>();

		for (const m of team.members || []) {
			const id = m.employee?.id;
			if (!id || id === employeeId) continue;

			memberIdSet.add(id);
			if (m.role?.name === ERoleName.MANAGER) {
				managerIdSet.add(id);
			}
		}

		deleteEmployeeFromTasks(employeeId).catch(console.error);
		updateOrganizationTeam(team, {
			memberIds: Array.from(memberIdSet),
			managerIds: Array.from(managerIdSet)
		});
	}, [updateOrganizationTeam, member, activeTeamRef, deleteEmployeeFromTasks]);

	return {
		makeMemberManager,
		unMakeMemberManager,
		removeMemberFromTeam,
		updateOTeamLoading
	};
}

export type I_TeamMemberRoleActionsHook = ReturnType<typeof useTeamMemberRoleActions>;

