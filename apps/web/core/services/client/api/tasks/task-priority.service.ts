import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import {
	validatePaginationResponse,
	taskPrioritySchema,
	validateApiResponse,
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
	 * @returns Promise<TTaskPriority> - Validated created task priority
	 * @throws ValidationError if response data doesn't match schema
	 */
	createTaskPriority = async (data: TTaskPriorityCreate): Promise<TTaskPriority> => {
		return this.executeWithValidation(
			() => this.post<TTaskPriority>('/task-priorities', data, { tenantId: this.tenantId }),
			(responseData) => validateApiResponse(taskPrioritySchema, responseData, 'createTaskPriority API response'),
			{ method: 'createTaskPriority', service: 'TaskPriorityService' }
		);
	};

	/**
	 * Update a task priority with validation
	 *
	 * @param taskPriorityId - Task priority ID to update
	 * @param data - Task priority data to update
	 * @returns Promise<TTaskPriority> - Validated updated task priority
	 * @throws ValidationError if response data doesn't match schema
	 */
	editTaskPriority = async ({ taskPriorityId, data }: { taskPriorityId: string; data: TTaskPriorityCreate }) => {
		return this.executeWithValidation(
			() => this.put<TTaskPriority>(`/task-priorities/${taskPriorityId}`, data, { tenantId: this.tenantId }),
			(responseData) => validateApiResponse(taskPrioritySchema, responseData, 'editTaskPriority API response'),
			{ method: 'editTaskPriority', service: 'TaskPriorityService', taskPriorityId }
		);
	};

	/**
	 * Delete a task priority with validation
	 *
	 * @param taskPriorityId - Task priority ID to delete
	 * @returns Promise<TTaskPriority> - Validated deleted task priority data
	 * @throws ValidationError if response data doesn't match schema
	 */
	deleteTaskPriority = async (taskPriorityId: string) => {
		return await this.delete<TTaskPriority>(`/task-priorities/${taskPriorityId}`);
	};

	/**
	 * Get task priorities list with validation
	 *
	 * @returns Promise<PaginationResponse<TTaskPriority>> - Validated task priorities data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getTaskPrioritiesList = async (): Promise<PaginationResponse<TTaskPriority>> => {
		const endpoint = `/task-priorities?tenantId=${this.tenantId}&organizationId=${this.organizationId}&organizationTeamId=${this.activeTeamId}`;

		return this.executeWithPaginationValidation(
			() => this.get<PaginationResponse<TTaskPriority>>(endpoint, { tenantId: this.tenantId }),
			(data) => validatePaginationResponse(taskPrioritySchema, data, 'getTaskPrioritiesList API response'),
			{ method: 'getTaskPrioritiesList', service: 'TaskPriorityService' }
		);
	};
}

export const taskPriorityService = new TaskPriorityService(GAUZY_API_BASE_SERVER_URL.value);
