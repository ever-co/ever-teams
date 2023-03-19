import { IOrganizationTeamEmployeeUpdate } from '@app/interfaces';
import {
	deleteOrganizationEmployeeTeamAPI,
	updateOrganizationEmployeeTeamAPI,
} from '@app/services/client/api/organization-team-employee';
import { useCallback } from 'react';
import { useQuery } from '../useQuery';
import { useOrganizationTeams } from './useOrganizationTeams';

export function useOrganizationEmployeeTeams() {
	const { loadTeamsData } = useOrganizationTeams();

	const {
		loading: deleteOrganizationEmployeeTeamLoading,
		queryCall: deleteQueryCall,
	} = useQuery(deleteOrganizationEmployeeTeamAPI);

	const {
		loading: updateOrganizationEmployeeTeamLoading,
		queryCall: updateQueryCall,
	} = useQuery(updateOrganizationEmployeeTeamAPI);

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
		[deleteQueryCall, loadTeamsData]
	);

	const updateOrganizationTeamEmployee = useCallback(
		(id: string, data: Partial<IOrganizationTeamEmployeeUpdate>) => {
			updateQueryCall(id, data).then((res) => {
				loadTeamsData();
				return res;
			});
		},
		[loadTeamsData, updateQueryCall]
	);

	return {
		deleteOrganizationEmployeeTeamLoading,
		deleteOrganizationTeamEmployee,
		updateOrganizationEmployeeTeamLoading,
		updateOrganizationTeamEmployee,
	};
}
