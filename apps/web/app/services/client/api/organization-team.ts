import { CreateResponse, DeleteResponse, ISuccessResponse, PaginationResponse } from '@app/interfaces/IDataResponse';

import {
	IOrganizationTeamList,
	IOrganizationTeamWithMStatus,
	IOrganizationTeamUpdate,
	IOrganizationTeam
} from '@app/interfaces';
import moment from 'moment';
import api, { get } from '../axios';

export function getOrganizationTeamsAPI() {
	return api.get<PaginationResponse<IOrganizationTeamList>>('/organization-team');
}

export function createOrganizationTeamAPI(name: string) {
	return api.post<PaginationResponse<IOrganizationTeamList>>('/organization-team', { name });
}

export async function getOrganizationTeamAPI(teamId: string, organizationId: string, tenantId: string) {
	const params = {
		organizationId: organizationId,
		tenantId: tenantId,
		// source: TimerSource.TEAMS,
		withLaskWorkedTask: 'true',
		startDate: moment().startOf('day').toISOString(),
		endDate: moment().endOf('day').toISOString(),
		includeOrganizationTeamId: 'false'
	} as { [x: string]: string };

	const relations = [
		'members',
		'members.role',
		'members.employee',
		'members.employee.user',
		'createdBy',
		'createdBy.employee',
		'projects',
		'projects.repository'
	];

	relations.forEach((rl, i) => {
		params[`relations[${i}]`] = rl;
	});

	const queries = new URLSearchParams(params || {});

	const endpoint = `/organization-team/${teamId}?${queries.toString()}`;
	const data = await get(endpoint, true);

	return process.env.NEXT_PUBLIC_GAUZY_API_SERVER_URL ? data.data : data;
}

export function editOrganizationTeamAPI(data: IOrganizationTeamUpdate) {
	return api.put<IOrganizationTeamList>(`/organization-team/${data.id}`, data);
}
export function updateOrganizationTeamAPI(teamId: string, data: Partial<IOrganizationTeamUpdate>) {
	return api.put<IOrganizationTeamWithMStatus>(`/organization-team/${teamId}`, data);
}

export function deleteOrganizationTeamAPI(id: string) {
	return api.delete<CreateResponse<IOrganizationTeam>>(`/organization-team/${id}`);
}
export function removeEmployeeOrganizationTeamAPI(employeeId: string) {
	return api.delete<boolean>(`/organization-team/employee/${employeeId}`);
}

export function removeUserFromAllTeamAPI(userId: string) {
	return api.delete<DeleteResponse | CreateResponse<ISuccessResponse>>(`/organization-team/teams/${userId}`);
}
