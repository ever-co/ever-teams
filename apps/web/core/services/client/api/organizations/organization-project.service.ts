import { APIService } from '../../api.service';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import {
	validatePaginationResponse,
	organizationProjectSchema,
	validateApiResponse,
	createProjectRequestSchema,
	editProjectRequestSchema,
	organizationProjectSettingSchema,
	deleteProjectNoContentResponseSchema,
	ZodValidationError,
	TOrganizationProject,
	TCreateProjectRequest,
	TEditProjectRequest,
	TOrganizationProjectSetting
} from '@/core/types/schemas';
import { scopedReadConfig, ScopedReadOptions } from '../../api-request-scope';

/**
 * Enhanced Organization Project Service with Zod validation
 *
 * This service extends the base APIService to add schema validation
 * for all API responses, ensuring data integrity and type safety.
 */
class OrganizationProjectService extends APIService {
	/**
	 * Edit organization project setting with validation
	 *
	 * @param organizationProjectId - Project ID
	 * @param data - Project setting data
	 * @returns Promise<TOrganizationProjectSetting> - Validated project setting
	 * @throws ValidationError if response data doesn't match schema
	 */
	editOrganizationProjectSetting = async ({
		organizationProjectId,
		data
	}: {
		organizationProjectId: string;
		data: any;
	}) => {
		try {
			const response = await this.put<TOrganizationProjectSetting>(
				`/organization-projects/setting/${organizationProjectId}`,
				data,
				{
					tenantId: this.tenantId
				}
			);

			// Validate the response data
			return validateApiResponse(
				organizationProjectSettingSchema,
				response.data,
				'editOrganizationProjectSetting API response'
			);
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Organization project setting validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'OrganizationProjectService'
				);
			}
			throw error;
		}
	};

	/**
	 * Create organization project with validation
	 *
	 * @param data - Project creation data
	 * @returns Promise<TOrganizationProject> - Validated created project
	 * @throws ValidationError if response data doesn't match schema
	 */
	createOrganizationProject = async (data: Partial<TCreateProjectRequest>): Promise<TOrganizationProject> => {
		try {
			// Validate input data before sending
			const validatedInput = validateApiResponse(
				createProjectRequestSchema.partial(), // Allow partial data for creation
				data,
				'createOrganizationProject input data'
			);

			const response = await this.post<TOrganizationProject>(`/organization-projects`, validatedInput);

			// Validate the response data
			return validateApiResponse(
				organizationProjectSchema,
				response.data,
				'createOrganizationProject API response'
			);
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Organization project creation validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'OrganizationProjectService'
				);
			}
			throw error;
		}
	};

	/**
	 * Edit organization project with validation
	 *
	 * @param organizationProjectId - Project ID
	 * @param data - Project edit data
	 * @returns Promise<TOrganizationProject> - Validated updated project
	 * @throws ValidationError if response data doesn't match schema
	 */
	editOrganizationProject = async ({
		organizationProjectId,
		data
	}: {
		organizationProjectId: string;
		data: TEditProjectRequest;
	}): Promise<TOrganizationProject> => {
		try {
			// Validate input data before sending
			const validatedInput = validateApiResponse(
				editProjectRequestSchema,
				data,
				'editOrganizationProject input data'
			);

			const response = await this.put<TOrganizationProject>(
				`/organization-projects/${organizationProjectId}`,
				validatedInput,
				{
					tenantId: this.tenantId
				}
			);

			// Validate the response data
			return validateApiResponse(
				organizationProjectSchema,
				response.data,
				'editOrganizationProject API response'
			);
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Organization project edit validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'OrganizationProjectService'
				);
			}
			throw error;
		}
	};

	/**
	 * Get organization project with validation
	 *
	 * @param organizationProjectId - Project ID
	 * @returns Promise<TOrganizationProject> - Validated project data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getOrganizationProject = async (
		organizationProjectId: string,
		options?: ScopedReadOptions
	): Promise<TOrganizationProject> => {
		try {
			const tenantId = options ? options.scope.tenantId : this.tenantId;
			// Include relations to get full project data (members, teams, tags, etc.)
			const relations = ['organizationContact', 'members.employee.user', 'tags', 'teams'];
			const obj: Record<string, string> = {
				tenantId: tenantId as string
			};

			relations.forEach((relation, i) => {
				obj[`relations[${i}]`] = relation;
			});

			const query = qs.stringify(obj);

			const response = await this.get<TOrganizationProject>(
				`/organization-projects/${organizationProjectId}?${query}`,
				options ? scopedReadConfig(options) : undefined
			);

			// Validate the response data
			return validateApiResponse(organizationProjectSchema, response.data, 'getOrganizationProject API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Organization project get validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'OrganizationProjectService'
				);
			}
			throw error;
		}
	};

	/**
	 * Get organization projects with validation and pagination
	 *
	 * @param queries - Optional query parameters
	 * @param skip - Number of items to skip for pagination
	 * @param take - Number of items to take for pagination
	 * @returns Promise<PaginationResponse<TOrganizationProject>> - Validated projects data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getOrganizationProjects = async ({
		queries,
		skip,
		take,
		signal,
		scope
	}: {
		queries?: Record<string, string>;
		skip?: number;
		take?: number;
		signal?: AbortSignal;
		scope?: ScopedReadOptions['scope'];
	} = {}): Promise<PaginationResponse<TOrganizationProject>> => {
		try {
			const tenantId = scope ? scope.tenantId : this.tenantId;
			const organizationId = scope ? scope.organizationId : this.organizationId;
			// No `join[...]` params here: the Gauzy API (stage, 2026-08) answers them with HTTP 200 and the
			// body {"message":"\"join\" option has been removed. Use \"relations\" ..."} — no items/total —
			// so every page logged "Organization projects validation failed" and projects never loaded.
			// `relations` below already left-joins tags, which is all the join was doing.
			const obj = {
				'where[organizationId]': organizationId,
				'where[tenantId]': tenantId
			} as Record<string, string>;

			// Relations matching the provided URL structure
			const relations = ['organizationContact', 'members.employee.user', 'tags', 'teams'];

			relations.forEach((relation, i) => {
				obj[`relations[${i}]`] = relation;
			});

			// Add skip and take if provided
			if (skip !== undefined) {
				obj['skip'] = skip.toString();
			}
			if (take !== undefined) {
				obj['take'] = take.toString();
			}

			// Add other queries
			if (queries) {
				Object.entries(queries).forEach(([key, value]) => {
					obj[key] = value;
				});
			}

			const query = qs.stringify(obj);

			const response = await this.get<PaginationResponse<TOrganizationProject>>(
				`/organization-projects?${query}`,
				scope ? scopedReadConfig({ scope, signal }) : { tenantId: this.tenantId, signal }
			);
			// Validate the response data using Zod schema
			return validatePaginationResponse(
				organizationProjectSchema,
				response.data,
				'getOrganizationProjects API response'
			);
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Organization projects validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'OrganizationProjectService'
				);
			}
			throw error;
		}
	};

	/**
	 * Delete organization project
	 *
	 * The Ever-Gauzy API returns HTTP 204 No Content on successful deletion.
	 * - No body is returned (empty response)
	 * - tenantId is automatically extracted from JWT token by the backend
	 * - Permissions required: ALL_ORG_EDIT or ORG_PROJECT_DELETE
	 *
	 * @param organizationProjectId - Project ID to delete (UUID)
	 * @returns Promise<void> - Resolves if deletion successful
	 * @throws Error - 404 if project not found, 403 if forbidden
	 *
	 */
	deleteOrganizationProject = async (organizationProjectId: string): Promise<void> => {
		try {
			const response = await this.delete(`/organization-projects/${organizationProjectId}`);

			// Validate that the response is empty (204 No Content)
			// This ensures the API behaves as expected
			deleteProjectNoContentResponseSchema.parse(response.data);
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Unexpected response format from DELETE organization project:',
					{
						message: error.message,
						issues: error.issues
					},
					'OrganizationProjectService'
				);
			}
			throw error;
		}
	};
}

export const organizationProjectService = new OrganizationProjectService(GAUZY_API_BASE_SERVER_URL.value);
