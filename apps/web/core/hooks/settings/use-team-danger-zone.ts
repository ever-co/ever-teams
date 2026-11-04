'use client';

import { useCallback, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { LAST_WORKSPACE_AND_TEAM } from '@/core/constants/config/constants';
import { activeTeamManagersState, activeTeamState, isTeamManagerState } from '@/core/stores';
import {
	employeeIdOf,
	memberNameOf,
	memberUserIdOf,
	rosterWithRole,
	teamDangerRulesOf,
	teamRosterOf,
	type TeamRoster
} from '@/core/lib/utils/settings-team';
import { useDeleteOrganizationTeam } from '@/core/hooks/organizations/teams/use-delete-organization-team';
import { useEditOrganizationTeam } from '@/core/hooks/organizations/teams/use-edit-organization-team';
import { useGetActiveTeam } from '@/core/hooks/organizations/teams/use-get-active-team';
import { useOrganizationEmployeeTeams } from '@/core/hooks/organizations/teams/use-organization-teams-employee';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import type { TOrganizationTeamEmployee } from '@/core/types/schemas';

export interface TransferCandidate {
	employeeId: string;
	name: string;
}

function managerEmployeeIds(managers: readonly TOrganizationTeamEmployee[], userId: string | undefined): Set<string> {
	const ids = new Set<string>();
	for (const manager of managers) {
		const isSelf = memberUserIdOf(manager) === userId;
		const employeeId = employeeIdOf(manager);
		if (isSelf || !employeeId) {
			continue;
		}
		ids.add(employeeId);
	}
	return ids;
}

/** The person who transfers stays in the team as a member. */
function transferRosterOf(
	members: readonly TOrganizationTeamEmployee[],
	managers: readonly TOrganizationTeamEmployee[],
	userId: string | undefined,
	newManagerEmployeeId: string
): TeamRoster {
	const otherManagerIds = managerEmployeeIds(managers, userId);
	const roster = teamRosterOf(members, (member) => {
		const employeeId = employeeIdOf(member);
		if (!employeeId) {
			return false;
		}
		return otherManagerIds.has(employeeId);
	});
	return rosterWithRole(roster, newManagerEmployeeId, 'manager');
}

export function useTeamDangerZone() {
	const { data: user } = useUserQuery();
	const activeTeam = useAtomValue(activeTeamState);
	const managers = useAtomValue(activeTeamManagersState);
	const isTeamManager = useAtomValue(isTeamManagerState);
	const getActiveTeam = useGetActiveTeam();
	const { editOrganizationTeam } = useEditOrganizationTeam();
	const { deleteOrganizationTeam } = useDeleteOrganizationTeam();
	const { deleteOrganizationTeamEmployee } = useOrganizationEmployeeTeams();
	const userId = user?.id;
	const members = activeTeam?.members;

	const isMember = useMemo(() => {
		const teamMembers = members ?? [];
		return teamMembers.some((member) => memberUserIdOf(member) === userId);
	}, [members, userId]);

	const rules = teamDangerRulesOf({ isTeamManager, managerCount: managers.length, isMember });

	const transferCandidates = useMemo<TransferCandidate[]>(() => {
		const candidates: TransferCandidate[] = [];
		for (const member of members ?? []) {
			const employeeId = employeeIdOf(member);
			const isSelf = memberUserIdOf(member) === userId;
			if (!employeeId || isSelf) {
				continue;
			}
			candidates.push({ employeeId, name: memberNameOf(member) });
		}
		return candidates;
	}, [members, userId]);

	const transferTeam = useCallback(
		async (newManagerEmployeeId: string) => {
			const team = getActiveTeam();
			if (!team) {
				throw new Error('No active team');
			}
			const roster = transferRosterOf(team.members ?? [], managers, userId, newManagerEmployeeId);
			await editOrganizationTeam({
				id: team.id,
				managerIds: roster.managerIds,
				memberIds: roster.memberIds,
				tenantId: team.tenantId,
				organizationId: team.organizationId,
				name: team.name
			});
		},
		[editOrganizationTeam, getActiveTeam, managers, userId]
	);

	const deleteTeam = useCallback(async () => {
		const team = getActiveTeam();
		if (!team) {
			throw new Error('No active team');
		}
		window.localStorage.removeItem(LAST_WORKSPACE_AND_TEAM);
		await deleteOrganizationTeam(team.id);
	}, [deleteOrganizationTeam, getActiveTeam]);

	const quitTeam = useCallback(async () => {
		const team = getActiveTeam();
		const ownEmployeeId = user?.employee?.id;
		const ownRow = team?.members?.find((member) => member.employeeId === ownEmployeeId);
		if (!ownRow?.id) {
			throw new Error('No membership row');
		}
		await deleteOrganizationTeamEmployee({ id: ownRow.id, employeeId: ownRow.employeeId ?? '' });
	}, [deleteOrganizationTeamEmployee, getActiveTeam, user?.employee?.id]);

	return {
		teamName: activeTeam?.name ?? '',
		rules,
		transferCandidates,
		transferTeam,
		deleteTeam,
		quitTeam
	};
}
