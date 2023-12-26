import { CreateResponse, DeleteResponse, ISuccessResponse, PaginationResponse } from '@app/interfaces/IDataResponse';

import {
	IOrganizationTeamList,
	IOrganizationTeamWithMStatus,
	IOrganizationTeamUpdate,
	IOrganizationTeam,
	TimerSource,
	OT_Member
} from '@app/interfaces';
import moment from 'moment';
import api, { get } from '../axios';
import { GAUZY_API_BASE_SERVER_URL } from '@app/constants';

export async function getOrganizationTeamsAPI(organizationId: string, tenantId: string) {
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

	const params = {
		'where[organizationId]': organizationId,
		'where[tenantId]': tenantId,
		source: TimerSource.TEAMS,
		withLaskWorkedTask: 'true'
	} as { [x: string]: string };

	relations.forEach((rl, i) => {
		params[`relations[${i}]`] = rl;
	});
	const query = new URLSearchParams(params);
	const endpoint = `/organization-team?${query.toString()}`;

	const data = await get(endpoint, true, { tenantId });
	return GAUZY_API_BASE_SERVER_URL.value ? data.data : data;
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

	return GAUZY_API_BASE_SERVER_URL.value ? data.data : data;
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

export function editEmployeeOrderOrganizationTeamAPI(employeeId: string, data: { order: number }) {
	return api.put<CreateResponse<OT_Member>>(`/organization-team/employee/${employeeId}`, data);
}

export function removeUserFromAllTeamAPI(userId: string) {
	return api.delete<DeleteResponse | CreateResponse<ISuccessResponse>>(`/organization-team/teams/${userId}`);
}
