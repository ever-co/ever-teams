import { CreateResponse, DeleteResponse, ISuccessResponse, PaginationResponse } from '@app/interfaces/IDataResponse';

import {
	IOrganizationTeamList,
	IOrganizationTeamUpdate,
	IOrganizationTeam,
	TimerSource,
	OT_Member
} from '@app/interfaces';
import moment from 'moment';
import api, { get, put } from '../axios';
import { GAUZY_API_BASE_SERVER_URL } from '@app/constants';
import { getOrganizationIdCookie, getTenantIdCookie } from '@app/helpers';

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

	return get<PaginationResponse<IOrganizationTeamList>>(endpoint, { tenantId });
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

	return get<IOrganizationTeamList>(endpoint);
}

export async function editOrganizationTeamAPI(data: IOrganizationTeamUpdate) {
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();

	let response = await put<IOrganizationTeamList>(`/organization-team/${data.id}`, data);

	if (GAUZY_API_BASE_SERVER_URL.value) {
		response = await getOrganizationTeamAPI(data.id, organizationId, tenantId);
	}

	return response;
}

export async function updateOrganizationTeamAPI(teamId: string, data: Partial<IOrganizationTeamUpdate>) {
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();

	let response = await put<IOrganizationTeamList>(`/organization-team/${teamId}`, data);

	if (GAUZY_API_BASE_SERVER_URL.value) {
		response = await getOrganizationTeamAPI(teamId, organizationId, tenantId);
	}

	return response;
}

export function deleteOrganizationTeamAPI(id: string) {
	return api.delete<CreateResponse<IOrganizationTeam>>(`/organization-team/${id}`);
}
export function removeEmployeeOrganizationTeamAPI(employeeId: string) {
	return api.delete<boolean>(`/organization-team/employee/${employeeId}`);
}

export function editEmployeeOrderOrganizationTeamAPI(
	employeeId: string,
	data: { order: number; organizationTeamId: string; organizationId: string },
	tenantId?: string
) {
	return api.put<CreateResponse<OT_Member>>(`/organization-team/employee/${employeeId}`, data, {
		headers: { 'Tenant-Id': tenantId }
	});
}

export function removeUserFromAllTeamAPI(userId: string) {
	return api.delete<DeleteResponse | CreateResponse<ISuccessResponse>>(`/organization-team/teams/${userId}`);
}
