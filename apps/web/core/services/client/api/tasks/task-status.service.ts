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
	ZodValidationError,
	TTaskStatus,
	TTaskStatusOrderAPIResponse,
	taskStatusOrderAPIResponseSchema
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
		try {
			// Validate input data before sending
			const validatedInput = validateApiResponse(
				taskStatusCreateSchema.partial(), // Allow partial data for creation
				data,
				'createTaskStatus input data'
			);

			const response = await this.post<TTaskStatus>('/task-statuses', validatedInput, {
				tenantId: this.tenantId
			});

			// Validate the response data
			return validateApiResponse(taskStatusSchema, response.data, 'createTaskStatus API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Task status creation validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'TaskStatusService'
				);
			}
			throw error;
		}
	};

	/**
	 * Edit an existing task status with validation
	 *
	 * @param taskStatusId - Task status ID to edit
	 * @param data - Task status data
	 * @returns Promise<TTaskStatus> - Validated updated task status
	 * @throws ValidationError if response data doesn't match schema
	 */
	editTaskStatus = async ({ taskStatusId, data }: { taskStatusId: string; data: ITaskStatusCreate }) => {
		try {
			// Validate input data before sending
			const validatedInput = validateApiResponse(
				taskStatusCreateSchema.partial(), // Allow partial data for updates
				data,
				'editTaskStatus input data'
			);

			const response = await this.put<TTaskStatus>(`/task-statuses/${taskStatusId}`, validatedInput, {
				tenantId: this.tenantId
			});

			// Validate the response data
			return validateApiResponse(taskStatusSchema, response.data, 'editTaskStatus API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Task status edit validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'TaskStatusService'
				);
			}
			throw error;
		}
	};

	/**
	 * Edit task status order with validation
	 *
	 * @param data - Task status order data
	 * @returns Promise<TTaskStatusOrderAPIResponse> - Validated reorder response
	 * @throws ValidationError if response data doesn't match schema
	 */
	editTaskStatusOrder = async (data: ITaskStatusOrder): Promise<TTaskStatusOrderAPIResponse> => {
		try {
			// Validate input data before sending
			const validatedInput = validateApiResponse(taskStatusOrderSchema, data, 'editTaskStatusOrder input data');

			const response = await this.patch<TTaskStatusOrderAPIResponse>(`/task-statuses/reorder`, validatedInput, {
				tenantId: this.tenantId,
				method: 'PATCH'
			});

			// Note: The response is validated against the full API response schema
			// which includes the complete task status order response structure
			return validateApiResponse(
				taskStatusOrderAPIResponseSchema,
				response.data,
				'editTaskStatusOrder API response'
			);
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Task status order edit validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'TaskStatusService'
				);
			}
			throw error;
		}
	};
	/**
	 * Delete a task status with validation
	 *
	 * @param taskStatusId - Task status ID to delete
	 * @returns Promise<TTaskStatus> - Validated deleted task status data
	 * @throws ValidationError if response data doesn't match schema
	 */
	deleteTaskStatus = async (taskStatusId: string): Promise<TTaskStatus> => {
		try {
			const response = await this.delete<TTaskStatus>(`/task-statuses/${taskStatusId}`);

			// Validate the response data
			return validateApiResponse(taskStatusSchema, response.data, 'deleteTaskStatus API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Task status deletion validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'TaskStatusService'
				);
			}
			throw error;
		}
	};

	/**
	 * Get all task statuses with validation
	 *
	 * @returns Promise<PaginationResponse<TTaskStatus>> - Validated task statuses data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getTaskStatuses = async (): Promise<PaginationResponse<TTaskStatus>> => {
		try {
			const query = qs.stringify({
				tenantId: this.tenantId,
				organizationId: this.organizationId,
				organizationTeamId: this.activeTeamId
			});

			const endpoint = `/task-statuses?${query}`;

			const response = await this.get<PaginationResponse<TTaskStatus>>(endpoint, { tenantId: this.tenantId });

			// Validate the response data using Zod schema
			return validatePaginationResponse(taskStatusSchema, response.data, 'getTaskStatuses API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Task statuses validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'TaskStatusService'
				);
			}
			throw error;
		}
	};
}

export const taskStatusService = new TaskStatusService(GAUZY_API_BASE_SERVER_URL.value);
