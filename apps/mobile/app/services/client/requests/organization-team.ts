/* eslint-disable camelcase */
import moment from 'moment';
import { PaginationResponse } from '../../interfaces/IDataResponse';
import {
	IOrganizationTeam,
	IOrganizationTeamCreate,
	IOrganizationTeamList,
	IOrganizationTeamUpdate,
	IOrganizationTeamWithMStatus
} from '../../interfaces/IOrganizationTeam';
import { serverFetch } from '../fetch';
import { createOrganizationProjectRequest } from './project';

export async function createOrganizationTeamRequest(data: IOrganizationTeamCreate, bearer_token: string) {
    try {
        // First create a project
        const { data: project } = await createOrganizationProjectRequest(
            {
                name: data.name,
                tenantId: data.tenantId,
                organizationId: data.organizationId
            },
            bearer_token
        );
        // Add the project to the team data
        const teamData = {
            ...data,
            projects: [project],
            public: data.public ?? true // Use passed value or default to true
        };
        // Create the team with the project
        return serverFetch<IOrganizationTeam>({
            path: '/organization-team',
            method: 'POST',
            body: teamData,
            bearer_token,
            tenantId: data.tenantId // Include tenantId as param
        });
    } catch (error) {
        console.error('[DEBUG] Error in team creation process:', error);
        console.log('[DEBUG] Error details:', JSON.stringify(error));
        throw error;
    }
}

export function updateOrganizationTeamRequest({
	id,
	datas,
	bearer_token
}: {
	datas: IOrganizationTeamList | IOrganizationTeamCreate;
	id: string;
	bearer_token: string;
}) {
	return serverFetch<IOrganizationTeamList>({
		path: `/organization-team/${id}`,
		method: 'PUT',
		body: datas,
		bearer_token
	});
}

/**
 * Fetches detailed information for a specific team within an organization.
 *
 * @param {TeamRequestParams & { teamId: string }} params Parameters including organizationId, tenantId, teamId, and optional relations.
 * @param {string} bearer_token Authentication token for the request.
 * @returns A Promise resolving to the detailed information of the organization team with member status.
 */
export function getOrganizationTeamRequest(
	{
		organizationId,
		tenantId,
		teamId,
		relations = ['members', 'members.role', 'members.employee', 'members.employee.user', 'projects']
	}: TeamRequestParams & { teamId: string },
	bearer_token: string
) {
	// Define query parameters
	const queryParameters = {
		organizationId,
		tenantId,
		withLastWorkedTask: 'true', // Corrected the typo here
		startDate: moment().startOf('day').toISOString(),
		endDate: moment().endOf('day').toISOString(),
		includeOrganizationTeamId: 'false',
		...Object.fromEntries(relations.map((relation, index) => [`relations[${index}]`, relation]))
	};

	// Construct the query string
	const query = new URLSearchParams(queryParameters);

	// Fetch and return the team data
	return serverFetch<IOrganizationTeamWithMStatus>({
		path: `/organization-team/${teamId}?${query.toString()}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}

type TeamRequestParams = {
	organizationId: string;
	tenantId: string;
	relations?: string[];
};

/**
 * Fetches a list of all teams within an organization, including specified relation data.
 *
 * @param {TeamRequestParams} params Contains organizationId, tenantId, and optional relation specifications.
 * @param {string} bearer_token Token for request authentication.
 * @returns A Promise resolving to a paginated response of organization team lists.
 */
export function getAllOrganizationTeamRequest(
	{
		organizationId,
		tenantId,
		relations = ['members', 'members.role', 'members.employee', 'members.employee.user']
	}: TeamRequestParams,
	bearer_token: string
) {
	// Define query parameters
	const queryParameters = {
		'where[organizationId]': organizationId,
		'where[tenantId]': tenantId,
		source: 'BROWSER',
		withLastWorkedTask: 'true',
		...Object.fromEntries(relations.map((relation, index) => [`relations[${index}]`, relation]))
	};

	const query = new URLSearchParams(queryParameters);

	return serverFetch<PaginationResponse<IOrganizationTeamList>>({
		path: `/organization-team?${query.toString()}`,
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
