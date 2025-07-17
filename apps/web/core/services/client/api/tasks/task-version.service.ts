import { getActiveTeamIdCookie, getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { APIService } from '../../api.service';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import {
	validatePaginationResponse,
	taskVersionSchema,
	validateApiResponse,
	taskVersionCreateSchema,
	taskVersionUpdateSchema,
	ZodValidationError,
	TTaskVersion,
	TTaskVersionCreate,
	TTaskVersionUpdate
} from '@/core/types/schemas';

/**
 * Enhanced Task Version Service with Zod validation
 *
 * This service extends the base APIService to add schema validation
 * for all API responses, ensuring data integrity and type safety.
 */
class TaskVersionService extends APIService {
	get organizationId() {
		return getOrganizationIdCookie();
	}
	get tenantId() {
		return getTenantIdCookie();
	}
	get activeTeamId() {
		return getActiveTeamIdCookie();
	}

	get activeTeamBasedQueries() {
		return {
			'where[organizationTeamId]': this.activeTeamId,
			'where[organizationId]': this.organizationId,
			'where[tenantId]': this.tenantId
		};
	}

	/**
	 * Create a new task version with validation
	 *
	 * @param data - Task version data without ID
	 * @returns Promise<TTaskVersion> - Validated created task version
	 * @throws ValidationError if response data doesn't match schema
	 */
	createTaskVersion = async (data: TTaskVersionCreate): Promise<TTaskVersion> => {
		try {
			// Validate input data before sending
			const validatedInput = validateApiResponse(taskVersionCreateSchema, data, 'createTaskVersion input data');

			const response = await this.post<TTaskVersion>(`/task-versions`, validatedInput, {
				tenantId: this.tenantId
			});

			// Validate the response data
			return validateApiResponse(taskVersionSchema, response.data, 'createTaskVersion API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Task version creation validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'TaskVersionService'
				);
			}
			throw error;
		}
	};

	/**
	 * Update a task version with validation
	 *
	 * @param id - Task version ID to update
	 * @param data - Partial task version data
	 * @returns Promise<TTaskVersion> - Validated updated task version
	 * @throws ValidationError if response data doesn't match schema
	 */
	updateTaskVersion = async (id: string, data: TTaskVersionUpdate): Promise<TTaskVersion> => {
		try {
			// Validate input data before sending
			const validatedInput = validateApiResponse(taskVersionUpdateSchema, data, 'updateTaskVersion input data');

			const response = await this.put<TTaskVersion>(`/task-versions/${id}`, validatedInput, {
				tenantId: this.tenantId
			});

			// Validate the response data
			return validateApiResponse(taskVersionSchema, response.data, 'updateTaskVersion API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Task version update validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'TaskVersionService'
				);
			}
			throw error;
		}
	};

	/**
	 * Delete a task version with validation
	 *
	 * @param id - Task version ID to delete
	 * @returns Promise<TTaskVersion> - Validated deleted task version data
	 * @throws ValidationError if response data doesn't match schema
	 */
	deleteTaskVersion = async (id: string): Promise<TTaskVersion> => {
		try {
			const response = await this.delete<TTaskVersion>(`/task-versions/${id}`, { tenantId: this.tenantId });

			// Validate the response data
			return validateApiResponse(taskVersionSchema, response.data, 'deleteTaskVersion API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Task version deletion validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'TaskVersionService'
				);
			}
			throw error;
		}
	};

	/**
	 * Get all task versions with validation
	 *
	 * @returns Promise<PaginationResponse<TTaskVersion>> - Validated task versions data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getTaskVersions = async (): Promise<PaginationResponse<TTaskVersion>> => {
		try {
			const query = qs.stringify(this.activeTeamBasedQueries);
			const endpoint = `/task-versions?${query}`;

			const response = await this.get<PaginationResponse<TTaskVersion>>(endpoint, { tenantId: this.tenantId });

			// Validate the response data using Zod schema
			return validatePaginationResponse(taskVersionSchema, response.data, 'getTaskVersions API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Task version validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'TaskVersionService'
				);
			}
			throw error;
		}
	};
}

export const taskVersionService = new TaskVersionService(GAUZY_API_BASE_SERVER_URL.value);
