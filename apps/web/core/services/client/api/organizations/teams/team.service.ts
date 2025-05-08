import {
	DeleteResponse,
	IOrganizationTeam,
	IOrganizationTeamCreate,
	IOrganizationTeamList,
	IOrganizationTeamUpdate,
	ITeamRequestParams,
	IUser,
	PaginationResponse,
	TimerSource
} from '@/core/types/interfaces';
import { APIService } from '@/core/services/client/api.service';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { getAccessTokenCookie, getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import api from '../../../axios';
import moment from 'moment';
import { organizationProjectService } from '../organization-project.service';

class OrganizationTeamService extends APIService {
	/**
	 * Fetches a list of teams for a specified organization.
	 *
	 * @param {string} organizationId The unique identifier for the organization.
	 * @param {string} tenantId The tenant identifier.
	 * @returns A Promise resolving to a paginated response containing the list of organization teams.
	 */
	getOrganizationTeams = async (organizationId: string, tenantId: string) => {
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

		return this.get<PaginationResponse<IOrganizationTeamList>>(endpoint, { tenantId });
	};

	createOrganizationTeamGauzy = async (data: IOrganizationTeamCreate, bearer_token: string) => {
		const project = await organizationProjectService.createOrganizationProject({
			name: data.name,
			tenantId: data.tenantId,
			organizationId: data.organizationId
		});

		data.projects = [project.data];

		return this.post<IOrganizationTeam>('/organization-team', data, {
			tenantId: data.tenantId,
			headers: { Authorization: `Bearer ${bearer_token}` }
		});
	};

	createOrganizationTeam = async (name: string, user: IUser) => {
		const $name = name.trim();

		if (GAUZY_API_BASE_SERVER_URL.value) {
			const tenantId = getTenantIdCookie();
			const organizationId = getOrganizationIdCookie();
			const access_token = getAccessTokenCookie() || '';

			await this.createOrganizationTeamGauzy(
				{
					name: $name,
					tenantId,
					organizationId,
					managerIds: user?.employee?.id ? [user.employee.id] : [],
					public: true
				},
				access_token
			);

			return this.getOrganizationTeams(organizationId, tenantId);
		}

		return api.post<PaginationResponse<IOrganizationTeamList>>('/organization-team', { name });
	};

	/**
	 * Fetches details of a specific team within an organization.
	 *
	 * @param {string} teamId The unique identifier of the team.
	 * @param {string} organizationId The unique identifier of the organization.
	 * @param {string} tenantId The tenant identifier.
	 * @returns A Promise resolving to the details of the specified organization team.
	 */
	getOrganizationTeam = async (teamId: string, organizationId: string, tenantId: string) => {
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
		return this.get<IOrganizationTeamList>(endpoint);
	};

	editOrganizationTeam = async (data: IOrganizationTeamUpdate) => {
		const tenantId = getTenantIdCookie();
		const organizationId = getOrganizationIdCookie();

		let response = await this.put<IOrganizationTeamList>(`/organization-team/${data.id}`, data);

		if (GAUZY_API_BASE_SERVER_URL.value) {
			response = await this.getOrganizationTeam(data.id, organizationId, tenantId);
		}

		return response;
	};

	updateOrganizationTeam = async (teamId: string, data: Partial<IOrganizationTeamUpdate>) => {
		const tenantId = getTenantIdCookie();
		const organizationId = getOrganizationIdCookie();

		let response = await this.put<IOrganizationTeamList>(`/organization-team/${teamId}`, data);

		if (GAUZY_API_BASE_SERVER_URL.value) {
			response = await this.getOrganizationTeam(teamId, organizationId, tenantId);
		}

		return response;
	};

	deleteOrganizationTeam = async (id: string) => {
		const organizationId = getOrganizationIdCookie();

		return this.delete<IOrganizationTeam>(`/organization-team/${id}?organizationId=${organizationId}`);
	};

	removeUserFromAllTeams = async (userId: string) => {
		return this.delete<DeleteResponse>(`/organization-team/teams/${userId}`);
	};

	/**
	 * Fetches a list of all teams within an organization, including specified relation data.
	 *
	 * @param {ITeamRequestParams} params Parameters for the team request, including organization and tenant IDs, and optional relations.
	 * @param {string} bearer_token The bearer token for authentication.
	 * @returns A Promise resolving to the pagination response of organization teams.
	 */
	getAllOrganizationTeam = async (params: ITeamRequestParams, bearer_token: string) => {
		const relations = params.relations || [
			'members',
			'members.role',
			'members.employee',
			'members.employee.user',
			'createdByUser',
			'projects',
			'projects.customFields.repository'
		];

		// Construct search queries
		const queryParams = {
			'where[organizationId]': params.organizationId,
			'where[tenantId]': params.tenantId,
			source: TimerSource.TEAMS,
			withLastWorkedTask: 'true', // Corrected the typo here
			...Object.fromEntries(relations.map((relation, index) => [`relations[${index}]`, relation]))
		};

		// Serialize search queries into a query string
		const queryString = qs.stringify(queryParams, { arrayFormat: 'brackets' });

		// Construct and execute the request
		return this.get<PaginationResponse<IOrganizationTeamList>>(`/organization-team?${queryString}`, {
			tenantId: params.tenantId,
			headers: {
				Authorization: `Bearer ${bearer_token}`
			}
		});
	};
}

export const organizationTeamService = new OrganizationTeamService(GAUZY_API_BASE_SERVER_URL.value);
