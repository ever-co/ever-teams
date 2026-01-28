import { APIService } from '../../api.service';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { ITaskStatusCreate } from '@/core/types/interfaces/task/task-status/task-status';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { ITaskStatusOrder } from '@/core/types/interfaces/task/task-status/task-status-order';
import {
	validatePaginationResponse,
	taskStatusSchema,
	validateApiResponse,
	taskStatusCreateSchema,
	taskStatusOrderSchema,
	TTaskStatus,
	TTaskStatusOrderAPIResponse,
	taskStatusOrderAPIResponseSchema,
	taskStatusUpdateResponseSchema,
	TTaskStatusUpdateResponse
} from '@/core/types/schemas';

/**
 * Enhanced Task Status Service with Zod validation
 *
 * This service extends the base APIService to add schema validation
 * for all API responses, ensuring data integrity and type safety.
 */
class TaskStatusService extends APIService {
	/**
	 * Create a new task status with validation
	 *
	 * @param data - Task status data
	 * @returns Promise<TTaskStatus> - Validated created task status
	 * @throws ValidationError if response data doesn't match schema
	 */
	createTaskStatus = async (data: ITaskStatusCreate): Promise<TTaskStatus> => {
		const validatedInput = validateApiResponse(
			taskStatusCreateSchema.partial(),
			data,
			'createTaskStatus input data'
		);

		return this.executeWithValidation(
			() => this.post<TTaskStatus>('/task-statuses', validatedInput, { tenantId: this.tenantId }),
			(responseData) => validateApiResponse(taskStatusSchema, responseData, 'createTaskStatus API response'),
			{ method: 'createTaskStatus', service: 'TaskStatusService' }
		);
	};

	/**
	 * Edit an existing task status with validation
	 *
	 * @param taskStatusId - Task status ID to edit
	 * @param data - Task status data
	 * @returns Promise<TTaskStatusUpdateResponse> - Validated update response
	 * @throws ValidationError if response data doesn't match schema
	 */
	editTaskStatus = async ({
		taskStatusId,
		data
	}: {
		taskStatusId: string;
		data: ITaskStatusCreate;
	}): Promise<TTaskStatusUpdateResponse> => {
		const validatedInput = validateApiResponse(
			taskStatusCreateSchema.partial(),
			data,
			'editTaskStatus input data'
		);

		return this.executeWithValidation(
			() => this.put<TTaskStatusUpdateResponse>(`/task-statuses/${taskStatusId}`, validatedInput, { tenantId: this.tenantId }),
			(responseData) => validateApiResponse(taskStatusUpdateResponseSchema, responseData, 'editTaskStatus API response'),
			{ method: 'editTaskStatus', service: 'TaskStatusService', taskStatusId }
		);
	};

	/**
	 * Edit task status order with validation
	 *
	 * @param data - Task status order data
	 * @returns Promise<TTaskStatusOrderAPIResponse> - Validated reorder response
	 * @throws ValidationError if response data doesn't match schema
	 */
	editTaskStatusOrder = async (data: ITaskStatusOrder): Promise<TTaskStatusOrderAPIResponse> => {
		const validatedInput = validateApiResponse(taskStatusOrderSchema, data, 'editTaskStatusOrder input data');

		return this.executeWithValidation(
			() => this.patch<TTaskStatusOrderAPIResponse>(`/task-statuses/reorder`, validatedInput, { tenantId: this.tenantId, method: 'PATCH' }),
			(responseData) => validateApiResponse(taskStatusOrderAPIResponseSchema, responseData, 'editTaskStatusOrder API response'),
			{ method: 'editTaskStatusOrder', service: 'TaskStatusService' }
		);
	};
	/**
	 * Delete a task status with validation
	 *
	 * @param taskStatusId - Task status ID to delete
	 * @returns Promise<TTaskStatus> - Validated deleted task status data
	 * @throws ValidationError if response data doesn't match schema
	 */
	deleteTaskStatus = async (taskStatusId: string): Promise<TTaskStatus> => {
		return this.executeWithValidation(
			() => this.delete<TTaskStatus>(`/task-statuses/${taskStatusId}`),
			(data) => validateApiResponse(taskStatusSchema, data, 'deleteTaskStatus API response'),
			{ method: 'deleteTaskStatus', service: 'TaskStatusService', taskStatusId }
		);
	};

	/**
	 * Get all task statuses with validation
	 *
	 * @returns Promise<PaginationResponse<TTaskStatus>> - Validated task statuses data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getTaskStatuses = async (): Promise<PaginationResponse<TTaskStatus>> => {
		const query = qs.stringify({
			tenantId: this.tenantId,
			organizationId: this.organizationId,
			organizationTeamId: this.activeTeamId
		});

		const endpoint = `/task-statuses?${query}`;

		return this.executeWithPaginationValidation(
			() => this.get<PaginationResponse<TTaskStatus>>(endpoint, { tenantId: this.tenantId }),
			(data) => validatePaginationResponse(taskStatusSchema, data, 'getTaskStatuses API response'),
			{ method: 'getTaskStatuses', service: 'TaskStatusService' }
		);
	};
}

export const taskStatusService = new TaskStatusService(GAUZY_API_BASE_SERVER_URL.value);
