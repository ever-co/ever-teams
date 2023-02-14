import { deleteOrganizationEmployeeTeamAPI } from '@app/services/client/api/organization-team-employee';
import { useCallback } from 'react';
import { useQuery } from '../useQuery';
import { useOrganizationTeams } from './useOrganizationTeams';

export function useOrganizationEmployeeTeams() {
	const { loadTeamsData } = useOrganizationTeams();

	const {
		loading: deleteOrganizationEmployeeTeamLoading,
		queryCall: deleteQueryCall,
	} = useQuery(deleteOrganizationEmployeeTeamAPI);
	const deleteOrganizationTeamEmployee = useCallback(
		({
			id,
			employeeId,
			organizationId,
			tenantId,
		}: {
			id: string;
			employeeId: string;
			organizationId: string;
			tenantId: string;
		}) => {
			return deleteQueryCall({
				id,
				employeeId,
				organizationId,
				tenantId,
			}).then((res) => {
				loadTeamsData();
				return res;
			});
		},
		[deleteOrganizationEmployeeTeamLoading]
	);

	return {
		deleteOrganizationEmployeeTeamLoading,
		deleteOrganizationTeamEmployee,
	};
}
