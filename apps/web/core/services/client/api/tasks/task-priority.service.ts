import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import {
	validatePaginationResponse,
	taskPrioritySchema,
	validateApiResponse,
	ZodValidationError,
	TTaskPriority,
	TTaskPriorityCreate
} from '@/core/types/schemas';

/**
 * Enhanced Task Priority Service with Zod validation
 *
 * This service extends the base APIService to add schema validation
 * for all API responses, ensuring data integrity and type safety.
 */
class TaskPriorityService extends APIService {
	/**
	 * Create a new task priority with validation
	 *
	 * @param data - Task priority data without ID
	 * @param tenantId - Optional tenant ID
	 * @returns Promise<TTaskPriority> - Validated created task priority
	 * @throws ValidationError if response data doesn't match schema
	 */
	createTaskPriority = async (data: TTaskPriorityCreate, tenantId?: string): Promise<TTaskPriority> => {
		try {
			const response = await this.post<TTaskPriority>('/task-priorities', data, {
				tenantId
			});

			// Validate the response data
			return validateApiResponse(taskPrioritySchema, response.data, 'createTaskPriority API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Task priority creation validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'TaskPriorityService'
				);
			}
			throw error;
		}
	};

	/**
	 * Update a task priority with validation
	 *
	 * @param id - Task priority ID to update
	 * @param data - Task priority data to update
	 * @param tenantId - Optional tenant ID
	 * @returns Promise<TTaskPriority> - Validated updated task priority
	 * @throws ValidationError if response data doesn't match schema
	 */
	editTaskPriority = async (id: string, data: TTaskPriorityCreate, tenantId?: string): Promise<TTaskPriority> => {
		try {
			const response = await this.put<TTaskPriority>(`/task-priorities/${id}`, data, {
				tenantId
			});

			// Validate the response data
			return validateApiResponse(taskPrioritySchema, response.data, 'editTaskPriority API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Task priority update validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'TaskPriorityService'
				);
			}
			throw error;
		}
	};

	/**
	 * Delete a task priority with validation
	 *
	 * @param id - Task priority ID to delete
	 * @returns Promise<TTaskPriority> - Validated deleted task priority data
	 * @throws ValidationError if response data doesn't match schema
	 */
	deleteTaskPriority = async (id: string) => {
		try {
			return await this.delete<TTaskPriority>(`/task-priorities/${id}`);
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Task priority deletion validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'TaskPriorityService'
				);
			}
			throw error;
		}
	};

	/**
	 * Get task priorities list with validation
	 *
	 * @param tenantId - Tenant ID
	 * @param organizationId - Organization ID
	 * @param organizationTeamId - Organization team ID (nullable)
	 * @returns Promise<PaginationResponse<TTaskPriority>> - Validated task priorities data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getTaskPrioritiesList = async (
		tenantId: string,
		organizationId: string,
		organizationTeamId: string | null
	): Promise<PaginationResponse<TTaskPriority>> => {
		try {
			const endpoint = `/task-priorities?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${organizationTeamId}`;

			const response = await this.get<PaginationResponse<TTaskPriority>>(endpoint, { tenantId });

			// Validate the response data using Zod schema
			return validatePaginationResponse(taskPrioritySchema, response.data, 'getTaskPrioritiesList API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Task priorities list validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'TaskPriorityService'
				);
			}
			throw error;
		}
	};
}

export const taskPriorityService = new TaskPriorityService(GAUZY_API_BASE_SERVER_URL.value);
