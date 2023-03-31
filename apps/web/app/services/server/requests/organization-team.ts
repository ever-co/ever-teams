import { PaginationResponse } from '@app/interfaces/IDataResponse';
import {
	IOrganizationTeam,
	IOrganizationTeamCreate,
	IOrganizationTeamList,
	IOrganizationTeamUpdate,
	IOrganizationTeamWithMStatus,
} from '@app/interfaces/IOrganizationTeam';
import moment from 'moment';
import { serverFetch } from '../fetch';

export function createOrganizationTeamRequest(
	datas: IOrganizationTeamCreate,
	bearer_token: string
) {
	return serverFetch<IOrganizationTeam>({
		path: '/organization-team',
		method: 'POST',
		body: datas,
		bearer_token,
		tenantId: datas.tenantId,
	});
}

/**
 * It updates an organization team
 * @param {IOrganizationTeamUpdate} datas - IOrganizationTeamUpdate - The data to be sent to the
 * server.
 * @param {string} bearer_token - The token that is used to authenticate the user.
 * @returns IOrganizationTeam
 */
export function updateOrganizationTeamRequest(
	datas: IOrganizationTeamUpdate & { id: string },
	bearer_token: string
) {
	const { id } = datas;

	return serverFetch<IOrganizationTeamUpdate>({
		path: `/organization-team/${id}`,
		method: 'PUT',
		body: datas,
		bearer_token,
		tenantId: datas.tenantId,
	});
}

export function deleteOrganizationTeamRequest({
	id,
	bearer_token,
	tenantId,
	organizationId,
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
		tenantId,
	});
}

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
			'createdBy.employee',
		],
	}: TeamRequestParams & { teamId: string },
	bearer_token: string
) {
	const params = {
		organizationId: organizationId,
		tenantId: tenantId,
		source: 'BROWSER',
		withLaskWorkedTask: 'true',
		startDate: moment().startOf('day').toISOString(),
		endDate: moment().endOf('day').toISOString(),
	} as { [x: string]: string };

	relations.forEach((rl, i) => {
		params[`relations[${i}]`] = rl;
	});

	const queries = new URLSearchParams(params || {});
	return serverFetch<IOrganizationTeamWithMStatus>({
		path: `/organization-team/${teamId}?${queries.toString()}`,
		method: 'GET',
		bearer_token,
		tenantId,
	});
}

type TeamRequestParams = {
	organizationId: string;
	tenantId: string;
	relations?: string[];
};

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
			'createdBy.employee',
		],
	}: TeamRequestParams,
	bearer_token: string
) {
	const params = {
		'where[organizationId]': organizationId,
		'where[tenantId]': tenantId,
		source: 'BROWSER',
		withLaskWorkedTask: 'true',
	} as { [x: string]: string };

	relations.forEach((rl, i) => {
		params[`relations[${i}]`] = rl;
	});

	const query = new URLSearchParams(params);

	return serverFetch<PaginationResponse<IOrganizationTeamList>>({
		path: `/organization-team?${query.toString()}`,
		method: 'GET',
		bearer_token,
		tenantId,
	});
}

export function removeEmployeeOrganizationTeamRequest({
	employeeId,
	bearer_token,
	tenantId,
}: {
	employeeId: string;
	bearer_token: string;
	tenantId: string;
}) {
	return serverFetch<boolean>({
		path: `/organization-team-employee/${employeeId}`,
		method: 'DELETE',
		bearer_token,
		tenantId,
	});
}

export function removeUserFromAllTeam({
	userId,
	bearer_token,
	tenantId,
}: {
	userId: string;
	bearer_token: string;
	tenantId: string;
}) {
	return serverFetch({
		path: `/organization-team/teams/${userId}`,
		method: 'DELETE',
		bearer_token,
		tenantId,
	});
}
