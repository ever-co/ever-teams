'use client';

import { useCallback, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useQueryClient } from '@tanstack/react-query';
import { activeTeamManagersState, isTeamManagerMember } from '@/core/stores';
import { queryKeys } from '@/core/query/keys';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';
import { useEmployeeUpdate } from '@/core/hooks/organizations/employees/use-employee';
import { useOrganizationEmployeeTeams } from '@/core/hooks/organizations/teams/use-organization-teams-employee';
import { mayTurnTrackingOfRole, rankInTeam, rankOfRole } from '@/core/lib/helpers/tracking-switch';
import { employeeIdOf, memberRoleNameOf, memberUserIdOf } from '@/core/lib/utils/settings-team';
import type { TOrganizationTeam, TOrganizationTeamEmployee } from '@/core/types/schemas';
import type { TUpdateEmployee } from '@/core/types/schemas/organization/employee.schema';

/**
 * Who may turn a member's time tracking on or off, and the save that does it, as Gauzy accepts it
 * (ever-co/ever-teams#5015): only someone of a higher rank, an admin also for another admin. Gauzy checks two
 * switches before a start: the member's switch in the team, and their own (employee) switch, which counts in every
 * team.
 *
 * - The team switch: Gauzy writes it for an admin or a manager of the team. A rank in a team is the tenant role's
 *   (SUPER_ADMIN and ADMIN, then MANAGER, then the rest), raised to manager for a manager of the team. A team manager
 *   therefore switches the members, never themselves nor another manager, and an admin switches anyone, admins
 *   included.
 * - The employee switch: it counts in every team, so only the tenant roles rank, and Gauzy writes it only for a holder
 *   of ORG_EMPLOYEES_EDIT (the admins, by default). Turning tracking on needs it on too, so whoever may write it moves
 *   it with the team switch; anyone else cannot turn on a member whose employee switch is off.
 * - A member whose role did not load could be an admin: only an admin switches them.
 * - Nothing is saved before the permissions are known: they decide whether the employee switch goes with the team one.
 */
export function useMemberTrackingSwitch() {
	const queryClient = useQueryClient();
	const { data: user } = useUserQuery();
	const managers = useAtomValue(activeTeamManagersState);
	// Read once is enough: a refresh that fails keeps the permissions read before, and they still decide
	const { myPermissions, isLoaded: arePermissionsLoaded } = useMyRolePermissionsQuery();
	const { updateOrganizationTeamEmployee } = useOrganizationEmployeeTeams();
	const { updateEmployeeAsync } = useEmployeeUpdate();

	const userId = user?.id;
	const ownRoleRank = rankOfRole(user?.role?.name);
	const managesTeam = managers.some((manager) => memberUserIdOf(manager) === userId);
	const ownRankInTeam = rankInTeam(ownRoleRank, managesTeam);
	// Gauzy writes a member's switch in the team for an admin or a manager of that team, and for nobody else
	const writesTeamSwitch = ownRoleRank === 'admin' || managesTeam;
	const canEditEmployees = myPermissions.includes('ORG_EMPLOYEES_EDIT');

	/** Whether the signed-in user may switch this member's tracking in the active team. */
	const mayTurnTracking = useCallback(
		(member: TOrganizationTeamEmployee) => {
			if (!writesTeamSwitch) {
				return false;
			}
			return mayTurnTrackingOfRole(ownRankInTeam, memberRoleNameOf(member), isTeamManagerMember(member));
		},
		[ownRankInTeam, writesTeamSwitch]
	);

	/** Whether the save moves the member's own (employee) switch too, which Gauzy allows only on these terms. */
	const writesEmployeeTracking = useCallback(
		(member: TOrganizationTeamEmployee) => {
			return canEditEmployees && mayTurnTrackingOfRole(ownRoleRank, memberRoleNameOf(member));
		},
		[canEditEmployees, ownRoleRank]
	);

	/**
	 * Turns the member's tracking on or off in the team: the team switch, then the employee switch when this user may
	 * write it. The team switch goes back when the employee one could not follow.
	 */
	const saveMemberTracking = useCallback(
		async (team: TOrganizationTeam, member: TOrganizationTeamEmployee, enabled: boolean) => {
			if (!arePermissionsLoaded) {
				// Without them an admin's save would write the team switch alone, and tracking would stay off
				throw new Error('The permissions are not known yet');
			}
			const rowId = member.id;
			const employeeId = employeeIdOf(member);
			if (!rowId || !employeeId) {
				throw new Error('Member without an employee');
			}
			const saveTeamTracking = (isTrackingEnabled: boolean) =>
				updateOrganizationTeamEmployee(rowId, {
					organizationId: team.organizationId,
					organizationTeamId: team.id,
					isTrackingEnabled
				});
			const previousTeamTracking = Boolean(member.isTrackingEnabled);
			await saveTeamTracking(enabled);
			if (writesEmployeeTracking(member)) {
				const employee = member.employee;
				const data: TUpdateEmployee = {
					isTrackingEnabled: enabled,
					id: employeeId,
					organizationId: employee?.organizationId,
					isActive: employee?.isActive,
					tenantId: employee?.tenantId
				};
				try {
					await updateEmployeeAsync({ id: employeeId, data });
				} catch (error) {
					await saveTeamTracking(previousTeamTracking).catch(() => undefined);
					throw error;
				}
			}
			// The rows read the employee through the team: without this they keep the old value
			await queryClient.invalidateQueries({ queryKey: queryKeys.organizationTeams.all });
		},
		[arePermissionsLoaded, queryClient, updateEmployeeAsync, updateOrganizationTeamEmployee, writesEmployeeTracking]
	);

	return useMemo(
		() => ({ arePermissionsLoaded, mayTurnTracking, writesEmployeeTracking, saveMemberTracking }),
		[arePermissionsLoaded, mayTurnTracking, writesEmployeeTracking, saveMemberTracking]
	);
}
