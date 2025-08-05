import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { ITaskSizesCreate } from '@/core/types/interfaces/task/task-size';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import {
	validatePaginationResponse,
	taskSizeSchema,
	validateApiResponse,
	ZodValidationError,
	TTaskSize
} from '@/core/types/schemas';

/**
 * Enhanced Task Size Service with Zod validation
 *
 * This service extends the base APIService to add schema validation
 * for all API responses, ensuring data integrity and type safety.
 */
class TaskSizeService extends APIService {
	/**
	 * Create a new task size with validation
	 *
	 * @param data - Task size data without ID
	 * @returns Promise<TTaskSize> - Validated created task size
	 * @throws ValidationError if response data doesn't match schema
	 */
	createTaskSize = async (data: ITaskSizesCreate): Promise<TTaskSize> => {
		try {
			const response = await this.post<TTaskSize>('/task-sizes', data, {
				tenantId: this.tenantId
			});

			// Validate the response data
			return validateApiResponse(taskSizeSchema, response.data, 'createTaskSize API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Task size creation validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'TaskSizeService'
				);
			}
			throw error;
		}
	};

	/**
	 * Update a task size with validation
	 *
	 * @param taskSizeId - Task size ID to update
	 * @param data - Task size data to update
	 * @returns Promise<TTaskSize> - Validated updated task size
	 * @throws ValidationError if response data doesn't match schema
	 */
	editTaskSize = async ({ taskSizeId, data }: { taskSizeId: string; data: ITaskSizesCreate }) => {
		try {
			const response = await this.put<TTaskSize>(`/task-sizes/${taskSizeId}`, data, {
				tenantId: this.tenantId
			});

			// Validate the response data
			return validateApiResponse(taskSizeSchema, response.data, 'editTaskSize API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Task size update validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'TaskSizeService'
				);
			}
			throw error;
		}
	};

	/**
	 * Delete a task size with validation
	 *
	 * @param taskSizeId - Task size ID to delete
	 * @returns Promise<TTaskSize> - Validated deleted task size data
	 * @throws ValidationError if response data doesn't match schema
	 */
	deleteTaskSize = async (taskSizeId: string) => {
		try {
			const response = await this.delete(`/task-sizes/${taskSizeId}`);

			return response;
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Task size deletion validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'TaskSizeService'
				);
			}
			throw error;
		}
	};

	/**
	 * Get all task sizes with validation
	 *
	 * @returns Promise<PaginationResponse<TTaskSize>> - Validated task sizes data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getTaskSizes = async (): Promise<PaginationResponse<TTaskSize>> => {
		try {
			const endpoint = `/task-sizes?tenantId=${this.tenantId}&organizationId=${this.organizationId}&organizationTeamId=${this.activeTeamId}`;
			const response = await this.get<PaginationResponse<TTaskSize>>(endpoint);

			// Validate the response data using Zod schema
			return validatePaginationResponse(taskSizeSchema, response.data, 'getTaskSizes API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Task size validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'TaskSizeService'
				);
			}
			throw error;
		}
	};
}

export const taskSizeService = new TaskSizeService(GAUZY_API_BASE_SERVER_URL.value);
