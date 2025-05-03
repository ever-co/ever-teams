import { IOrganizationTeamEmployeeUpdate, OT_Member } from '@/core/types/interfaces';
import { useCallback } from 'react';
import { useQuery } from '../useQuery';
import { useOrganizationTeams } from './useOrganizationTeams';
import { organizationTeamService } from '@/core/services/client/api';
import { userState } from '@/core/stores';
import { useAtom } from 'jotai';
import { organizationTeamEmployeeService } from '@/core/services/client/api';

export function useOrganizationEmployeeTeams() {
	const { loadTeamsData } = useOrganizationTeams();
	const [user] = useAtom(userState);

	const { loading: deleteOrganizationEmployeeTeamLoading, queryCall: deleteQueryCall } = useQuery(
		organizationTeamEmployeeService.deleteOrganizationEmployeeTeam
	);

	const { loading: updateOrganizationEmployeeTeamLoading, queryCall: updateQueryCall } = useQuery(
		organizationTeamEmployeeService.updateOrganizationEmployeeTeam
	);

	const { loading: editEmployeeIndexOrganizationTeamLoading, queryCall: updateOrderCall } = useQuery(
		organizationTeamService.editEmployeeOrderOrganizationTeamAPI
	);

	const {
		loading: updateOrganizationTeamEmployeeActiveTaskLoading,
		queryCall: updateOrganizationTeamEmployeeActiveTaskQueryCall
	} = useQuery(organizationTeamEmployeeService.updateOrganizationTeamEmployeeActiveTask);

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
		(employee: OT_Member, order: number) => {
			updateOrderCall(
				employee.id,
				{
					order,
					organizationTeamId: employee.organizationTeamId,
					organizationId: employee.organizationId
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
