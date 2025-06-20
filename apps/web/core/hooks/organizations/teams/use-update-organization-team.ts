'use client';
import { IOrganizationTeam, IOrganizationTeamUpdate } from '@/core/types/interfaces/team/organization-team';
import { useCallback } from 'react';
import { organizationTeamService } from '@/core/services/client/api/organizations/teams';
import { useQueryCall } from '../../common';
import { TOrganizationTeamEmployeeUpdate } from '@/core/types/schemas';
import { useTeamsState } from './use-teams-state';

/**
 * It takes a team and an optional data object and updates the team with the data
 */
export function useUpdateOrganizationTeam() {
	const { loading, queryCall } = useQueryCall(organizationTeamService.updateOrganizationTeam);
	const { setTeamsUpdate } = useTeamsState();

	const updateOrganizationTeam = useCallback(
		(team: IOrganizationTeam, data: Partial<IOrganizationTeamUpdate> = {}) => {
			const members = team.members;

			const body: Partial<TOrganizationTeamEmployeeUpdate> = {
				id: team.id,
				memberIds: members
					?.map((t) => t.employee?.id || '')
					.filter((value, index, array) => array.indexOf(value) === index), // To make the array Unique list of ids
				managerIds: members
					?.filter((m) => m.role && m.role.name === 'MANAGER')
					.map((t) => t.employee?.id || '')
					.filter((value, index, array) => array.indexOf(value) === index), // To make the array Unique list of ids
				name: team.name,
				tenantId: team.tenantId,
				organizationId: team.organizationId,
				tags: [],
				...data
			};

			/* Updating the team state with the data from the API. */
			queryCall(team.id, body).then((res) => {
				setTeamsUpdate(res.data);
			});
		},
		[queryCall, setTeamsUpdate]
	);

	return { updateOrganizationTeam, loading };
}
