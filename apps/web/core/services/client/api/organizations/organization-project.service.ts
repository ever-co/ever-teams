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
		return this.executeWithValidation(
			() => this.put<TOrganizationProjectSetting>(
				`/organization-projects/setting/${organizationProjectId}`,
				data,
				{ tenantId: this.tenantId }
			),
			(responseData) => validateApiResponse(
				organizationProjectSettingSchema,
				responseData,
				'editOrganizationProjectSetting API response'
			),
			{ method: 'editOrganizationProjectSetting', service: 'OrganizationProjectService', organizationProjectId }
		);
	};

	/**
	 * Create organization project with validation
	 *
	 * @param data - Project creation data
	 * @returns Promise<TOrganizationProject> - Validated created project
	 * @throws ValidationError if response data doesn't match schema
	 */
	createOrganizationProject = async (data: Partial<TCreateProjectRequest>): Promise<TOrganizationProject> => {
		const validatedInput = validateApiResponse(
			createProjectRequestSchema.partial(),
			data,
			'createOrganizationProject input data'
		);

		return this.executeWithValidation(
			() => this.post<TOrganizationProject>(`/organization-projects`, validatedInput),
			(responseData) => validateApiResponse(
				organizationProjectSchema,
				responseData,
				'createOrganizationProject API response'
			),
			{ method: 'createOrganizationProject', service: 'OrganizationProjectService' }
		);
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
		const validatedInput = validateApiResponse(
			editProjectRequestSchema,
			data,
			'editOrganizationProject input data'
		);

		return this.executeWithValidation(
			() => this.put<TOrganizationProject>(
				`/organization-projects/${organizationProjectId}`,
				validatedInput,
				{ tenantId: this.tenantId }
			),
			(responseData) => validateApiResponse(
				organizationProjectSchema,
				responseData,
				'editOrganizationProject API response'
			),
			{ method: 'editOrganizationProject', service: 'OrganizationProjectService', organizationProjectId }
		);
	};

	/**
	 * Get organization project with validation
	 *
	 * @param organizationProjectId - Project ID
	 * @returns Promise<TOrganizationProject> - Validated project data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getOrganizationProject = async (organizationProjectId: string): Promise<TOrganizationProject> => {
		const relations = ['organizationContact', 'members.employee.user', 'tags', 'teams'];
		const obj: Record<string, string> = {
			tenantId: this.tenantId
		};

		relations.forEach((relation, i) => {
			obj[`relations[${i}]`] = relation;
		});

		const query = qs.stringify(obj);

		return this.executeWithValidation(
			() => this.get<TOrganizationProject>(`/organization-projects/${organizationProjectId}?${query}`),
			(data) => validateApiResponse(organizationProjectSchema, data, 'getOrganizationProject API response'),
			{ method: 'getOrganizationProject', service: 'OrganizationProjectService', organizationProjectId }
		);
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
		const obj = {
			'where[organizationId]': this.organizationId,
			'where[tenantId]': this.tenantId,
			'join[alias]': 'organization_project',
			'join[leftJoin][tags]': 'organization_project.tags'
		} as Record<string, string>;

		const relations = ['organizationContact', 'members.employee.user', 'tags', 'teams'];

		relations.forEach((relation, i) => {
			obj[`relations[${i}]`] = relation;
		});

		if (skip !== undefined) {
			obj['skip'] = skip.toString();
		}
		if (take !== undefined) {
			obj['take'] = take.toString();
		}

		if (queries) {
			Object.entries(queries).forEach(([key, value]) => {
				obj[key] = value;
			});
		}

		const query = qs.stringify(obj);

		return this.executeWithPaginationValidation(
			() => this.get<PaginationResponse<TOrganizationProject>>(
				`/organization-projects?${query}`,
				{ tenantId: this.tenantId }
			),
			(data) => validatePaginationResponse(
				organizationProjectSchema,
				data,
				'getOrganizationProjects API response'
			),
			{ method: 'getOrganizationProjects', service: 'OrganizationProjectService' }
		);
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
		const response = await this.delete(`/organization-projects/${organizationProjectId}`);
		deleteProjectNoContentResponseSchema.parse(response.data);
	};
}

export const organizationProjectService = new OrganizationProjectService(GAUZY_API_BASE_SERVER_URL.value);
