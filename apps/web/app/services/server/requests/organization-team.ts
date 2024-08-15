import { TimerSource } from '@app/interfaces';
import { PaginationResponse } from '@app/interfaces/IDataResponse';
import {
	IOrganizationTeam,
	IOrganizationTeamCreate,
	IOrganizationTeamList,
	IOrganizationTeamUpdate,
	IOrganizationTeamWithMStatus,
	ITeamRequestParams
} from '@app/interfaces';
import moment from 'moment';
import { serverFetch } from '../fetch';
import { createOrganizationProjectRequest } from './project';
import qs from 'qs';

export async function createOrganizationTeamRequest(datas: IOrganizationTeamCreate, bearer_token: string) {
	// Create project
	const { data: project } = await createOrganizationProjectRequest(
		{
			name: datas.name,
			tenantId: datas.tenantId,
			organizationId: datas.organizationId
		},
		bearer_token
	);

	datas.projects = [project];

	return serverFetch<IOrganizationTeam>({
		path: '/organization-team',
		method: 'POST',
		body: datas,
		bearer_token,
		tenantId: datas.tenantId
	});
}

/**
 * It updates an organization team
 * @param {IOrganizationTeamUpdate} datas - IOrganizationTeamUpdate - The data to be sent to the
 * server.
 * @param {string} bearer_token - The token that is used to authenticate the user.
 * @returns IOrganizationTeam
 */
export function updateOrganizationTeamRequest(datas: IOrganizationTeamUpdate & { id: string }, bearer_token: string) {
	const { id } = datas;

	return serverFetch<IOrganizationTeamUpdate>({
		path: `/organization-team/${id}`,
		method: 'PUT',
		body: datas,
		bearer_token,
		tenantId: datas.tenantId
	});
}

export function deleteOrganizationTeamRequest({
	id,
	bearer_token,
	tenantId,
	organizationId
}: {
	id: string;
	bearer_token: string;
	tenantId: string;
	organizationId: string;
}) {
	return serverFetch<IOrganizationTeamUpdate>({
		path: `/organization-team/${id}?organizationId=${organizationId}`,
		method: 'DELETE',
		bearer_token,
		tenantId
	});
}

/**
 * Fetches detailed information for a specific team within an organization.
 *
 * @param {ITeamRequestParams & { teamId: string }} params Contains team, organization, tenant IDs, and optional relations.
 * @param {string} bearer_token Token for authenticating the request.
 * @returns A Promise resolving to the detailed information of the organization team with additional status.
 */
export function getOrganizationTeamRequest(
	{
		organizationId,
		tenantId,
		teamId,
		relations = [
			'members',
			'members.role',
			'members.employee',
			'members.employee.user',
			'createdBy',
			'projects'
			// 'projects.customFields.repository'
		]
	}: ITeamRequestParams & { teamId: string },
	bearer_token: string
) {
	// Define base query parameters
	const queryParams = {
		organizationId,
		tenantId,
		// source: TimerSource.TEAMS,
		withLastWorkedTask: 'true', // Corrected typo
		startDate: moment().startOf('day').toISOString(),
		endDate: moment().endOf('day').toISOString(),
		includeOrganizationTeamId: 'false',
		...Object.fromEntries(relations.map((relation, index) => [`relations[${index}]`, relation]))
	};

	// Serialize parameters into a query string
	const queryString = qs.stringify(queryParams, { arrayFormat: 'brackets' });

	// Fetch and return team details
	return serverFetch<IOrganizationTeamWithMStatus>({
		path: `/organization-team/${teamId}?${queryString}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}

/**
 * Fetches team details for a specified organization from the server.
 *
 * @param {TeamRequestParams} params Contains organizationId, tenantId, and optional relationship specifications.
 * @param {string} bearer_token Token for request authentication.
 * @returns A Promise resolving to a paginated list of organization team data.
 */
export function getAllOrganizationTeamRequest(
	{
		organizationId,
		tenantId,
		relations = [
			'members',
			'members.role',
			'members.employee',
			'members.employee.user',
			'createdBy',
			'projects'
			// 'projects.customFields.repository'
		]
	}: ITeamRequestParams,
	bearer_token: string
) {
	// Consolidate all parameters into a single object
	const params = {
		'where[organizationId]': organizationId,
		'where[tenantId]': tenantId,
		source: TimerSource.TEAMS,
		withLastWorkedTask: 'true',
		relations
	};

	// Serialize parameters into a query string
	const query = qs.stringify(params, { arrayFormat: 'brackets' });

	// Construct and return the server fetch request
	return serverFetch<PaginationResponse<IOrganizationTeamList>>({
		path: `/organization-team?${query}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}

export function removeEmployeeOrganizationTeamRequest({
	employeeId,
	bearer_token,
	tenantId
}: {
	employeeId: string;
	bearer_token: string;
	tenantId: string;
}) {
	return serverFetch<boolean>({
		path: `/organization-team-employee/${employeeId}`,
		method: 'DELETE',
		bearer_token,
		tenantId
	});
}

export function addEmployeeOrganizationTeamOrderRequest({
	employeeId,
	bearer_token,
	tenantId,
	order,
	organizationTeamId,
	organizationId
}: {
	employeeId: string;
	bearer_token: string;
	tenantId: string;
	order: number;
	organizationTeamId: string;
	organizationId: string;
}) {
	const res = serverFetch({
		path: `/organization-team-employee/${employeeId}`,
		method: 'PUT',
		bearer_token,
		body: { order, organizationTeamId, organizationId },
		tenantId
	});

	return res;
}

export function removeUserFromAllTeam({
	userId,
	bearer_token,
	tenantId
}: {
	userId: string;
	bearer_token: string;
	tenantId: string;
}) {
	return serverFetch({
		path: `/organization-team/teams/${userId}`,
		method: 'DELETE',
		bearer_token,
		tenantId
	});
}
