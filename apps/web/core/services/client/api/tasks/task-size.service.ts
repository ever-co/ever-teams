import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { ITaskSizesCreate } from '@/core/types/interfaces/task/task-size';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import {
	validatePaginationResponse,
	taskSizeSchema,
	validateApiResponse,
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
		return this.executeWithValidation(
			() => this.post<TTaskSize>('/task-sizes', data, { tenantId: this.tenantId }),
			(responseData) => validateApiResponse(taskSizeSchema, responseData, 'createTaskSize API response'),
			{ method: 'createTaskSize', service: 'TaskSizeService' }
		);
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
		return this.executeWithValidation(
			() => this.put<TTaskSize>(`/task-sizes/${taskSizeId}`, data, { tenantId: this.tenantId }),
			(responseData) => validateApiResponse(taskSizeSchema, responseData, 'editTaskSize API response'),
			{ method: 'editTaskSize', service: 'TaskSizeService', taskSizeId }
		);
	};

	/**
	 * Delete a task size with validation
	 *
	 * @param taskSizeId - Task size ID to delete
	 * @returns Promise<TTaskSize> - Validated deleted task size data
	 * @throws ValidationError if response data doesn't match schema
	 */
	deleteTaskSize = async (taskSizeId: string) => {
		return await this.delete(`/task-sizes/${taskSizeId}`);
	};

	/**
	 * Get all task sizes with validation
	 *
	 * @returns Promise<PaginationResponse<TTaskSize>> - Validated task sizes data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getTaskSizes = async (): Promise<PaginationResponse<TTaskSize>> => {
		const endpoint = `/task-sizes?tenantId=${this.tenantId}&organizationId=${this.organizationId}&organizationTeamId=${this.activeTeamId}`;
		
		return this.executeWithPaginationValidation(
			() => this.get<PaginationResponse<TTaskSize>>(endpoint),
			(data) => validatePaginationResponse(taskSizeSchema, data, 'getTaskSizes API response'),
			{ method: 'getTaskSizes', service: 'TaskSizeService' }
		);
	};
}

export const taskSizeService = new TaskSizeService(GAUZY_API_BASE_SERVER_URL.value);
