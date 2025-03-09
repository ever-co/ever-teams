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
import { getAccessTokenCookie, getOrganizationIdCookie, getTenantIdCookie } from '@app/helpers';
import { createOrganizationProjectAPI } from './projects';
import qs from 'qs';

/**
 * Fetches a list of teams for a specified organization.
 *
 * @param {string} organizationId The unique identifier for the organization.
 * @param {string} tenantId The tenant identifier.
 * @returns A Promise resolving to a paginated response containing the list of organization teams.
 */
export async function getOrganizationTeamsAPI(organizationId: string, tenantId: string) {
	const relations = [
		'members',
		'members.role',
		'members.employee',
		'members.employee.user',
		'createdByUser',
		'projects',
		'projects.customFields.repository'
	];
	// Construct the query parameters including relations
	const queryParameters = {
		'where[organizationId]': organizationId,
		'where[tenantId]': tenantId,
		source: TimerSource.TEAMS,
		withLastWorkedTask: 'true', // Corrected the typo here
		relations
	};

	// Serialize parameters into a query string
	const query = qs.stringify(queryParameters, { arrayFormat: 'brackets' });

	const endpoint = `/organization-team?${query}`;

	return get<PaginationResponse<IOrganizationTeamList>>(endpoint, { tenantId });
}

export async function createOrganizationTeamGauzy(datas: IOrganizationTeamCreate, bearer_token: string) {
	const project = await createOrganizationProjectAPI({
		name: datas.name,
		tenantId: datas.tenantId,
		organizationId: datas.organizationId
	});

	datas.projects = [project.data];

	return post<IOrganizationTeam>('/organization-team', datas, {
		tenantId: datas.tenantId,
		headers: { Authorization: `Bearer ${bearer_token}` }
	});
}

export async function createOrganizationTeamAPI(name: string, user: IUser) {
	const $name = name.trim();

	if (GAUZY_API_BASE_SERVER_URL.value) {
		const tenantId = getTenantIdCookie();
		const organizationId = getOrganizationIdCookie();
		const access_token = getAccessTokenCookie() || '';

		await createOrganizationTeamGauzy(
			{
				name: $name,
				tenantId,
				organizationId,
				managerIds: user?.employee?.id ? [user.employee.id] : [],
				public: true
			},
			access_token
		);

		return getOrganizationTeamsAPI(organizationId, tenantId);
	}

	return api.post<PaginationResponse<IOrganizationTeamList>>('/organization-team', { name });
}

/**
 * Fetches details of a specific team within an organization.
 *
 * @param {string} teamId The unique identifier of the team.
 * @param {string} organizationId The unique identifier of the organization.
 * @param {string} tenantId The tenant identifier.
 * @returns A Promise resolving to the details of the specified organization team.
 */
export async function getOrganizationTeamAPI(teamId: string, organizationId: string, tenantId: string) {
	const relations = [
		'members',
		'members.role',
		'members.employee',
		'members.employee.user',
		'createdByUser',
		'projects',
		'projects.customFields.repository'
	];

	// Define base parameters including organization and tenant IDs, and date range
	const queryParams = {
		organizationId,
		tenantId,
		withLastWorkedTask: 'true', // Corrected the typo here
		startDate: moment().startOf('day').toISOString(),
		endDate: moment().endOf('day').toISOString(),
		includeOrganizationTeamId: 'false',
		relations
	};

	// Serialize parameters into a query string using 'qs'
	const queryString = qs.stringify(queryParams, { arrayFormat: 'brackets' });

	// Construct the endpoint URL
	const endpoint = `/organization-team/${teamId}?${queryString}`;

	// Fetch and return the team details
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
