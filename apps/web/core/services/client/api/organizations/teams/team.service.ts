import { APIService, getFallbackAPI } from '@/core/services/client/api.service';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { getAccessTokenCookie, getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import moment from 'moment';
import { organizationProjectService } from '../organization-project.service';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import { DeleteResponse, PaginationResponse } from '@/core/types/interfaces/common/data-response';
import {
	validateApiResponse,
	validatePaginationResponse,
	organizationTeamSchema,
	ZodValidationError,
	TOrganizationTeam,
	TOrganizationTeamCreate,
	TOrganizationTeamUpdate,
	TTeamRequestParams,
	TUser,
	TOrganizationProject,
	organizationTeamCreateResponseSchema,
	organizationTeamUpdateSchema
} from '@/core/types/schemas';

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
			source: ETimeLogSource.TEAMS,
			withLastWorkedTask: 'true', // Corrected the typo here
			relations
		};

		// Serialize parameters into a query string
		const query = qs.stringify(queryParameters, { arrayFormat: 'brackets' });

		const endpoint = `/organization-team?${query}`;

		try {
			const response = await this.get<PaginationResponse<TOrganizationTeam>>(endpoint, { tenantId });

			// Validate paginated response data and return the original response structure
			const validatedData = validatePaginationResponse(
				organizationTeamSchema,
				response.data,
				'getOrganizationTeams API response'
			);

			// Return response with validated data
			return {
				...response,
				data: validatedData
			};
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error('Organization teams validation failed:', {
					message: error.message,
					issues: error.issues,
					context: 'getOrganizationTeams'
				});
			}
			throw error;
		}
	};

	createOrganizationTeamGauzy = async (data: TOrganizationTeamCreate, bearer_token: string) => {
		const project = await organizationProjectService.createOrganizationProject({
			name: data.name,
			tenantId: data.tenantId,
			organizationId: data.organizationId
		});

		data.projects = [project.data as TOrganizationProject];

		try {
			const response = await this.post<TOrganizationTeam>('/organization-team', data, {
				tenantId: data.tenantId,
				headers: { Authorization: `Bearer ${bearer_token}` }
			});

			// Validate single organization team response data
			const validatedData = validateApiResponse(
				organizationTeamCreateResponseSchema,
				response.data,
				'createOrganizationTeamGauzy API response'
			);

			// Return response with validated data
			return {
				...response,
				data: validatedData
			};
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error('Create organization team Gauzy validation failed:', {
					message: error.message,
					issues: error.issues,
					context: 'createOrganizationTeamGauzy'
				});
			}
			throw error;
		}
	};

	createOrganizationTeam = async (name: string, user: TUser) => {
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

		const api = await getFallbackAPI();
		const response = await api.post<PaginationResponse<TOrganizationTeam>>('/organization-team', { name });

		try {
			// Validate fallback API response data
			const validatedData = validatePaginationResponse(
				organizationTeamSchema,
				response.data,
				'createOrganizationTeam fallback API response'
			);

			// Return response with validated data
			return {
				...response,
				data: validatedData
			};
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error('Create organization team fallback validation failed:', {
					message: error.message,
					issues: error.issues,
					context: 'createOrganizationTeam fallback'
				});
			}
			throw error;
		}
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

		try {
			// Fetch and return the team details
			const response = await this.get<TOrganizationTeam>(endpoint);

			// Validate single organization team response data
			const validatedData = validateApiResponse(
				organizationTeamSchema,
				response.data,
				'getOrganizationTeam API response'
			);

			// Return response with validated data
			return {
				...response,
				data: validatedData
			};
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error('Get organization team validation failed:', {
					message: error.message,
					issues: error.issues,
					context: 'getOrganizationTeam',
					teamId,
					organizationId
				});
			}
			throw error;
		}
	};

	editOrganizationTeam = async (data: TOrganizationTeamUpdate) => {
		const tenantId = getTenantIdCookie();
		const organizationId = getOrganizationIdCookie();

		try {
			let response = await this.put<TOrganizationTeam>(`/organization-team/${data.id}`, data);

			if (GAUZY_API_BASE_SERVER_URL.value) {
				response = await this.getOrganizationTeam(data.id, organizationId, tenantId);
			} else {
				// Validate the response data for non-Gauzy API
				const validatedData = validateApiResponse(
					organizationTeamSchema,
					response.data,
					'editOrganizationTeam API response'
				);

				// Return response with validated data
				response = {
					...response,
					data: validatedData
				};
			}

			return response;
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error('Edit organization team validation failed:', {
					message: error.message,
					issues: error.issues,
					context: 'editOrganizationTeam',
					teamId: data.id
				});
			}
			throw error;
		}
	};

	updateOrganizationTeam = async (teamId: string, data: Partial<TOrganizationTeamUpdate>) => {
		const tenantId = getTenantIdCookie();
		const organizationId = getOrganizationIdCookie();

		try {
			let response = await this.put<TOrganizationTeam>(`/organization-team/${teamId}`, data);

			if (GAUZY_API_BASE_SERVER_URL.value) {
				response = await this.getOrganizationTeam(teamId, organizationId, tenantId);
			} else {
				// Validate the response data for non-Gauzy API
				const validatedData = validateApiResponse(
					organizationTeamUpdateSchema,
					response.data,
					'updateOrganizationTeam API response'
				);

				// Return response with validated data
				response = {
					...response,
					data: validatedData as TOrganizationTeam
				};
			}

			return response;
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error('Update organization team validation failed:', {
					message: error.message,
					issues: error.issues,
					context: 'updateOrganizationTeam',
					teamId
				});
			}
			throw error;
		}
	};

	deleteOrganizationTeam = async (id: string) => {
		const organizationId = getOrganizationIdCookie();

		try {
			const response = await this.delete<TOrganizationTeam>(
				`/organization-team/${id}?organizationId=${organizationId}`
			);

			// Validate delete response data
			const validatedData = validateApiResponse(
				organizationTeamSchema,
				response.data,
				'deleteOrganizationTeam API response'
			);

			// Return response with validated data
			return {
				...response,
				data: validatedData
			};
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error('Delete organization team validation failed:', {
					message: error.message,
					issues: error.issues,
					context: 'deleteOrganizationTeam',
					teamId: id
				});
			}
			throw error;
		}
	};

	removeUserFromAllTeams = async (userId: string) => {
		try {
			const response = await this.delete<DeleteResponse>(`/organization-team/teams/${userId}`);

			// Note: DeleteResponse doesn't need Zod validation as it's a simple response type
			return response;
		} catch (error) {
			this.logger.error('Remove user from all teams failed:', {
				context: 'removeUserFromAllTeams',
				userId
			});
			throw error;
		}
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
			withLastWorkedTask: 'true', // Corrected the typo here
			...Object.fromEntries(relations.map((relation, index) => [`relations[${index}]`, relation]))
		};

		// Serialize search queries into a query string
		const queryString = qs.stringify(queryParams, { arrayFormat: 'brackets' });

		try {
			// Construct and execute the request
			const response = await this.get<PaginationResponse<TOrganizationTeam>>(
				`/organization-team?${queryString}`,
				{
					tenantId: params.tenantId,
					headers: {
						Authorization: `Bearer ${bearer_token}`
					}
				}
			);

			// Validate paginated response data
			const validatedData = validatePaginationResponse(
				organizationTeamSchema,
				response.data,
				'getAllOrganizationTeam API response'
			);

			// Return response with validated data
			return {
				...response,
				data: validatedData
			};
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error('Get all organization teams validation failed:', {
					message: error.message,
					issues: error.issues,
					context: 'getAllOrganizationTeam',
					params
				});
			}
			throw error;
		}
	};
}

export const organizationTeamService = new OrganizationTeamService(GAUZY_API_BASE_SERVER_URL.value);
