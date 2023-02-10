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
		(id: string) => {
			return deleteQueryCall(id).then((res) => {
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
