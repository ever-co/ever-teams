import { APIService, getFallbackAPI } from '@/core/services/client/api.service';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { getAccessTokenCookie } from '@/core/lib/helpers/cookies';
import moment from 'moment';
import { organizationProjectService } from '../organization-project.service';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import { DeleteResponse, PaginationResponse } from '@/core/types/interfaces/common/data-response';
import {
	validateApiResponse,
	validatePaginationResponse,
	organizationTeamSchema,
	organizationTeamCreateSchema,
	TOrganizationTeam,
	TOrganizationTeamCreate,
	TTeamRequestParams,
	TUser,
	TOrganizationProject,
	organizationTeamCreateResponseSchema,
	organizationTeamUpdateSchema,
	TOrganizationTeamUpdate
} from '@/core/types/schemas';

class OrganizationTeamService extends APIService {
	/**
	 * Fetches a list of teams for a specified organization.
	 *
	 * @returns A Promise resolving to a paginated response containing the list of organization teams.
	 */
	getOrganizationTeams = async () => {
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
			'where[organizationId]': this.organizationId,
			'where[tenantId]': this.tenantId,
			source: ETimeLogSource.TEAMS,
			withLastWorkedTask: 'true',
			relations
		};

		// Serialize parameters into a query string
		const query = qs.stringify(queryParameters, { arrayFormat: 'brackets' });

		const endpoint = `/organization-team?${query}`;

		return this.executeWithPaginationValidation(
			() => this.get<PaginationResponse<TOrganizationTeam>>(endpoint, { tenantId: this.tenantId }),
			(data) => validatePaginationResponse(organizationTeamSchema, data, 'getOrganizationTeams API response'),
			{ method: 'getOrganizationTeams', service: 'OrganizationTeamService' }
		);
	};

	createOrganizationTeamGauzy = async ({
		data,
		bearer_token
	}: {
		data: TOrganizationTeamCreate;
		bearer_token: string;
	}) => {
		const validatedInput = validateApiResponse(
			organizationTeamCreateSchema,
			data,
			'createOrganizationTeamGauzy input data'
		) as TOrganizationTeamCreate;

		const project = await organizationProjectService.createOrganizationProject({
			name: validatedInput.name,
			tenantId: validatedInput.tenantId,
			organizationId: validatedInput.organizationId
		});

		validatedInput.projects = [project.data as TOrganizationProject];

		return this.executeWithValidation(
			() => this.post<TOrganizationTeam>('/organization-team', validatedInput, {
				tenantId: validatedInput.tenantId,
				headers: { Authorization: `Bearer ${bearer_token}` }
			}),
			(responseData) => validateApiResponse(organizationTeamCreateResponseSchema, responseData, 'createOrganizationTeamGauzy API response'),
			{ method: 'createOrganizationTeamGauzy', service: 'OrganizationTeamService' }
		);
	};

	createOrganizationTeam = async (name: string, user: TUser) => {
		const $name = name.trim();

		if (GAUZY_API_BASE_SERVER_URL.value) {
			const tenantId = this.tenantId;
			const organizationId = this.organizationId;
			const access_token = getAccessTokenCookie() || '';

			await this.createOrganizationTeamGauzy({
				data: {
					name: $name,
					tenantId,
					organizationId,
					managerIds: user?.employee?.id ? [user.employee.id] : [],
					public: true
				},
				bearer_token: access_token
			});

			return this.getOrganizationTeams();
		}

		const api = await getFallbackAPI();

		return this.executeWithPaginationValidation(
			async () => api.post<PaginationResponse<TOrganizationTeam>>('/organization-team', { name }),
			(data) => validatePaginationResponse(organizationTeamSchema, data, 'createOrganizationTeam fallback API response'),
			{ method: 'createOrganizationTeam', service: 'OrganizationTeamService' }
		);
	};

	/**
	 * Fetches details of a specific team within an organization.
	 *
	 * @param {string} teamId The unique identifier of the team.
	 * @returns A Promise resolving to the details of the specified organization team.
	 */
	getOrganizationTeam = async (teamId: string) => {
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
			organizationId: this.organizationId,
			tenantId: this.tenantId,
			withLastWorkedTask: 'true',
			startDate: moment().startOf('day').toISOString(),
			endDate: moment().endOf('day').toISOString(),
			includeOrganizationTeamId: 'false',
			relations
		};

		// Serialize parameters into a query string using 'qs'
		const queryString = qs.stringify(queryParams, { arrayFormat: 'brackets' });

		// Construct the endpoint URL
		const endpoint = `/organization-team/${teamId}?${queryString}`;

		return this.executeWithValidation(
			() => this.get<TOrganizationTeam>(endpoint),
			(data) => validateApiResponse(organizationTeamSchema, data, 'getOrganizationTeam API response'),
			{ method: 'getOrganizationTeam', service: 'OrganizationTeamService', teamId, organizationId: this.organizationId }
		);
	};

	editOrganizationTeam = async (data: Partial<TOrganizationTeamUpdate>) => {
		const validatedInput = validateApiResponse(
			organizationTeamUpdateSchema.partial(),
			data,
			'editOrganizationTeam input data'
		) as Partial<TOrganizationTeamUpdate>;

		if (GAUZY_API_BASE_SERVER_URL.value) {
			await this.put<TOrganizationTeam>(`/organization-team/${validatedInput.id}`, validatedInput);
			return this.getOrganizationTeam(validatedInput.id!);
		}

		return this.executeWithValidation(
			() => this.put<TOrganizationTeam>(`/organization-team/${validatedInput.id}`, validatedInput),
			(responseData) => validateApiResponse(organizationTeamSchema, responseData, 'editOrganizationTeam API response'),
			{ method: 'editOrganizationTeam', service: 'OrganizationTeamService', teamId: validatedInput.id }
		);
	};

	updateOrganizationTeam = async (teamId: string, data: Partial<TOrganizationTeamUpdate>) => {
		const validatedInput = validateApiResponse(
			organizationTeamUpdateSchema.partial(),
			data,
			'updateOrganizationTeam input data'
		) as Partial<TOrganizationTeam>;

		if (GAUZY_API_BASE_SERVER_URL.value) {
			await this.put<TOrganizationTeam>(`/organization-team/${teamId}`, validatedInput);
			return this.getOrganizationTeam(teamId);
		}

		return this.executeWithValidation(
			() => this.put<TOrganizationTeam>(`/organization-team/${teamId}`, validatedInput),
			(responseData) => validateApiResponse(organizationTeamUpdateSchema, responseData, 'updateOrganizationTeam API response') as TOrganizationTeam,
			{ method: 'updateOrganizationTeam', service: 'OrganizationTeamService', teamId }
		);
	};

	deleteOrganizationTeam = async (id: string) => {
		if (!id || typeof id !== 'string' || id.trim().length === 0) {
			throw new Error('Valid team ID is required for deletion');
		}

		return this.executeWithValidation(
			() => this.delete<TOrganizationTeam>(`/organization-team/${id}?organizationId=${this.organizationId}`),
			(data) => validateApiResponse(organizationTeamSchema, data, 'deleteOrganizationTeam API response'),
			{ method: 'deleteOrganizationTeam', service: 'OrganizationTeamService', teamId: id }
		);
	};

	removeUserFromAllTeams = async (userId: string) => {
		return this.delete<DeleteResponse>(`/organization-team/teams/${userId}`);
	};

	/**
	 * Fetches a list of all teams within an organization, including specified relation data.
	 *
	 * @param {TTeamRequestParams} params Parameters for the team request, including organization and tenant IDs, and optional relations.
	 * @param {string} bearer_token The bearer token for authentication.
	 * @returns A Promise resolving to the pagination response of organization teams.
	 */
	getAllOrganizationTeam = async (params: TTeamRequestParams, bearer_token: string) => {
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
			source: ETimeLogSource.TEAMS,
			withLastWorkedTask: 'true',
			...Object.fromEntries(relations.map((relation, index) => [`relations[${index}]`, relation]))
		};

		// Serialize search queries into a query string
		const queryString = qs.stringify(queryParams, { arrayFormat: 'brackets' });

		return this.executeWithPaginationValidation(
			() => this.get<PaginationResponse<TOrganizationTeam>>(
				`/organization-team?${queryString}`,
				{
					tenantId: params.tenantId,
					headers: {
						Authorization: `Bearer ${bearer_token}`
					}
				}
			),
			(data) => validatePaginationResponse(organizationTeamSchema, data, 'getAllOrganizationTeam API response'),
			{ method: 'getAllOrganizationTeam', service: 'OrganizationTeamService', params }
		);
	};
}

export const organizationTeamService = new OrganizationTeamService(GAUZY_API_BASE_SERVER_URL.value);
