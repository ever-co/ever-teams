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
	TTaskStatusOrder
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
	 * @param tenantId - Optional tenant ID
	 * @returns Promise<TTaskStatus> - Validated created task status
	 * @throws ValidationError if response data doesn't match schema
	 */
	createTaskStatus = async (data: ITaskStatusCreate, tenantId?: string): Promise<TTaskStatus> => {
		try {
			// Validate input data before sending
			const validatedInput = validateApiResponse(
				taskStatusCreateSchema.partial(), // Allow partial data for creation
				data,
				'createTaskStatus input data'
			);

			const response = await this.post<TTaskStatus>('/task-statuses', validatedInput, {
				tenantId
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
	 * @param id - Task status ID to edit
	 * @param data - Task status data
	 * @param tenantId - Optional tenant ID
	 * @returns Promise<TTaskStatus> - Validated updated task status
	 * @throws ValidationError if response data doesn't match schema
	 */
	editTaskStatus = async (id: string, data: ITaskStatusCreate, tenantId?: string): Promise<TTaskStatus> => {
		try {
			// Validate input data before sending
			const validatedInput = validateApiResponse(
				taskStatusCreateSchema.partial(), // Allow partial data for updates
				data,
				'editTaskStatus input data'
			);

			const response = await this.put<TTaskStatus>(`/task-statuses/${id}`, validatedInput, {
				tenantId
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
	 * @param tenantId - Optional tenant ID
	 * @returns Promise<TTaskStatusOrder['reorder']> - Validated reorder response
	 * @throws ValidationError if response data doesn't match schema
	 */
	editTaskStatusOrder = async (data: ITaskStatusOrder, tenantId?: string): Promise<TTaskStatusOrder['reorder']> => {
		try {
			// Validate input data before sending
			const validatedInput = validateApiResponse(taskStatusOrderSchema, data, 'editTaskStatusOrder input data');

			const response = await this.patch<TTaskStatusOrder['reorder']>(`/task-statuses/reorder`, validatedInput, {
				tenantId,
				method: 'PATCH'
			});

			// Note: The response is just the reorder array, not the full order object
			// So we validate against the reorder schema specifically
			const reorderSchema = taskStatusOrderSchema.pick({ reorder: true }).shape.reorder;
			return validateApiResponse(reorderSchema, response.data, 'editTaskStatusOrder API response');
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
	 * @param id - Task status ID to delete
	 * @returns Promise<TTaskStatus> - Validated deleted task status data
	 * @throws ValidationError if response data doesn't match schema
	 */
	deleteTaskStatus = async (id: string): Promise<TTaskStatus> => {
		try {
			const response = await this.delete<TTaskStatus>(`/task-statuses/${id}`);

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
	 * @param tenantId - Tenant ID
	 * @param organizationId - Organization ID
	 * @param organizationTeamId - Organization team ID (optional)
	 * @returns Promise<PaginationResponse<TTaskStatus>> - Validated task statuses data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getTaskStatuses = async (
		tenantId: string,
		organizationId: string,
		organizationTeamId: string | null
	): Promise<PaginationResponse<TTaskStatus>> => {
		try {
			const query = qs.stringify({
				tenantId,
				organizationId,
				organizationTeamId
			});

			const endpoint = `/task-statuses?${query}`;

			const response = await this.get<PaginationResponse<TTaskStatus>>(endpoint, { tenantId });

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
