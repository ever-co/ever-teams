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
	ZodValidationError,
	TOrganizationProject,
	TCreateProjectRequest,
	TEditProjectRequest,
	TOrganizationProjectSetting
} from '@/core/types/schemas';

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
	getOrganizationProject = async (organizationProjectId: string): Promise<TOrganizationProject> => {
		try {
			const response = await this.get<TOrganizationProject>(`/organization-projects/${organizationProjectId}`, {
				tenantId: this.tenantId
			});

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
		take
	}: {
		queries?: Record<string, string>;
		skip?: number;
		take?: number;
	} = {}): Promise<PaginationResponse<TOrganizationProject>> => {
		try {
			const obj = {
				'where[organizationId]': this.organizationId,
				'where[tenantId]': this.tenantId,
				'join[alias]': 'organization_project',
				'join[leftJoin][tags]': 'organization_project.tags'
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
				{
					tenantId: this.tenantId
				}
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
	 * Delete organization project with validation
	 *
	 * @param organizationProjectId - Project ID to delete
	 * @returns Promise<TOrganizationProject> - Validated deleted project data
	 * @throws ValidationError if response data doesn't match schema
	 */
	deleteOrganizationProject = async (organizationProjectId: string): Promise<TOrganizationProject> => {
		try {
			const response = await this.delete<TOrganizationProject>(
				`/organization-projects/${organizationProjectId}`,
				{
					data: {
						tenantId: this.tenantId
					}
				}
			);

			// Validate the response data
			return validateApiResponse(
				organizationProjectSchema,
				response.data,
				'deleteOrganizationProject API response'
			);
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Organization project deletion validation failed:',
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
