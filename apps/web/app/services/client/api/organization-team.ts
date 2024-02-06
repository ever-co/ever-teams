import { DeleteResponse, PaginationResponse } from '@app/interfaces/IDataResponse';

import {
	IOrganizationTeamList,
	IOrganizationTeamUpdate,
	IOrganizationTeam,
	TimerSource,
	OT_Member,
	IOrganizationTeamCreate,
	IUser
} from '@app/interfaces';
import moment from 'moment';
import api, { deleteApi, get, post, put } from '../axios';
import { GAUZY_API_BASE_SERVER_URL } from '@app/constants';
import { getOrganizationIdCookie, getTenantIdCookie } from '@app/helpers';
import { createOrganizationProjectAPI } from './projects';
import qs from 'qs';

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
	const query = qs.stringify(params);
	const endpoint = `/organization-team?${query}`;

	return get<PaginationResponse<IOrganizationTeamList>>(endpoint, { tenantId });
}

export async function createOrganizationTeamAPI(name: string, user: IUser) {
	const $name = name.trim();

	if (GAUZY_API_BASE_SERVER_URL.value) {
		const tenantId = getTenantIdCookie();
		const organizationId = getOrganizationIdCookie();

		const datas: IOrganizationTeamCreate = {
			name: $name,
			tenantId,
			organizationId,
			managerIds: user?.employee?.id ? [user.employee.id] : [],
			public: true
		};

		const project = await createOrganizationProjectAPI({
			name: $name,
			tenantId,
			organizationId
		});

		datas.projects = [project.data];

		await post('/organization-team', datas, {
			tenantId
		});

		return getOrganizationTeamsAPI(organizationId, tenantId);
	}

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

	const queries = qs.stringify(params);

	const endpoint = `/organization-team/${teamId}?${queries}`;

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
	const organizationId = getOrganizationIdCookie();

	return deleteApi<IOrganizationTeam>(`/organization-team/${id}?organizationId=${organizationId}`);
}

export function removeEmployeeOrganizationTeamAPI(employeeId: string) {
	const endpoint = GAUZY_API_BASE_SERVER_URL.value
		? `/organization-team-employee/${employeeId}`
		: `/organization-team/employee/${employeeId}`;

	return deleteApi<boolean>(endpoint);
}

export function editEmployeeOrderOrganizationTeamAPI(
	employeeId: string,
	data: { order: number; organizationTeamId: string; organizationId: string },
	tenantId?: string
) {
	const endpoint = GAUZY_API_BASE_SERVER_URL.value
		? `/organization-team-employee/${employeeId}`
		: `/organization-team/employee/${employeeId}`;

	return put<OT_Member>(endpoint, data, { tenantId });
}

export function removeUserFromAllTeamAPI(userId: string) {
	return deleteApi<DeleteResponse>(`/organization-team/teams/${userId}`);
}
