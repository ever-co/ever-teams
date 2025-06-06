import { useCallback } from 'react';
import { useOrganizationTeams } from './use-organization-teams';
import { userState } from '@/core/stores';
import { useAtom } from 'jotai';
import { organizationTeamEmployeeService } from '@/core/services/client/api/organizations/teams';
import { useQueryCall } from '../../common';
import {
	IOrganizationTeamEmployee,
	IOrganizationTeamEmployeeUpdate
} from '@/core/types/interfaces/team/organization-team-employee';

export function useOrganizationEmployeeTeams() {
	const { loadTeamsData } = useOrganizationTeams();
	const [user] = useAtom(userState);

	const { loading: deleteOrganizationEmployeeTeamLoading, queryCall: deleteQueryCall } = useQueryCall(
		organizationTeamEmployeeService.deleteOrganizationEmployeeTeam
	);

	const { loading: updateOrganizationEmployeeTeamLoading, queryCall: updateQueryCall } = useQueryCall(
		organizationTeamEmployeeService.updateOrganizationEmployeeTeam
	);

	const { loading: editEmployeeIndexOrganizationTeamLoading, queryCall: updateOrderCall } = useQueryCall(
		organizationTeamEmployeeService.editEmployeeOrderOrganizationTeam
	);

	const {
		loading: updateOrganizationTeamEmployeeActiveTaskLoading,
		queryCall: updateOrganizationTeamEmployeeActiveTaskQueryCall
	} = useQueryCall(organizationTeamEmployeeService.updateOrganizationTeamEmployeeActiveTask);

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

	const updateOrganizationTeamEmployeeOrderOnList = useCallback(
		(employee: IOrganizationTeamEmployee, order: number) => {
			updateOrderCall(
				employee.id,
				{
					order,
					organizationTeamId: employee.organizationTeamId ?? '',
					organizationId: employee.organizationId ?? ''
				},
				user?.tenantId || ''
			).then((res) => {
				loadTeamsData();
				return res;
			});
		},

		[loadTeamsData, updateOrderCall, user]
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
		updateOrganizationTeamEmployeeOrderOnList
	};
}
