import { IOrganizationTeamEmployeeUpdate } from '@app/interfaces';
import {
	deleteOrganizationEmployeeTeamAPI,
	updateOrganizationEmployeeTeamAPI,
	updateOrganizationTeamEmployeeActiveTaskAPI
} from '@app/services/client/api/organization-team-employee';
import { useCallback } from 'react';
import { useQuery } from '../useQuery';
import { useOrganizationTeams } from './useOrganizationTeams';
import { editEmployeeIndexOrganizationTeamAPI } from '@app/services/client/api';

export function useOrganizationEmployeeTeams() {
	const { loadTeamsData } = useOrganizationTeams();

	const { loading: deleteOrganizationEmployeeTeamLoading, queryCall: deleteQueryCall } = useQuery(
		deleteOrganizationEmployeeTeamAPI
	);

	const { loading: updateOrganizationEmployeeTeamLoading, queryCall: updateQueryCall } = useQuery(
		updateOrganizationEmployeeTeamAPI
	);

	const { loading: editEmployeeIndexOrganizationTeamLoading, queryCall: updateIndexCall } = useQuery(
		editEmployeeIndexOrganizationTeamAPI
	);

	const {
		loading: updateOrganizationTeamEmployeeActiveTaskLoading,
		queryCall: updateOrganizationTeamEmployeeActiveTaskQueryCall
	} = useQuery(updateOrganizationTeamEmployeeActiveTaskAPI);

	const deleteOrganizationTeamEmployee = useCallback(
		({
			id,
			employeeId,
			organizationId,
			tenantId
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
				tenantId
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

	const updateOrganizationTeamEmployeeIndexOnList = useCallback(
		(employeeId: string, index: number) => {
			updateIndexCall(employeeId, { index }).then((res) => {
				loadTeamsData();
				return res;
			});
		},
		[loadTeamsData, updateIndexCall]
	);

	const updateOrganizationTeamEmployeeActiveTask = useCallback(
		(id: string, data: Partial<IOrganizationTeamEmployeeUpdate>) => {
			updateOrganizationTeamEmployeeActiveTaskQueryCall(id, data).then((res) => {
				loadTeamsData();
				return res;
			});
		},
		[loadTeamsData, updateOrganizationTeamEmployeeActiveTaskQueryCall]
	);

	return {
		deleteOrganizationEmployeeTeamLoading,
		deleteOrganizationTeamEmployee,
		updateOrganizationEmployeeTeamLoading,
		updateOrganizationTeamEmployee,
		updateOrganizationTeamEmployeeActiveTaskLoading,
		updateOrganizationTeamEmployeeActiveTask,
		editEmployeeIndexOrganizationTeamLoading,
		updateOrganizationTeamEmployeeIndexOnList
	};
}
