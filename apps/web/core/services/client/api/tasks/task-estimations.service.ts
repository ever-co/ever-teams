import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { APIService } from '../../api.service';
import {
	createTaskEstimationSchema,
	taskEstimationsSchema,
	TCreateTaskEstimation,
	TTaskEstimation
} from '@/core/types/schemas/task/task.schema';
import { validateApiResponse, ZodValidationError } from '@/core/types/schemas';

/**
 * Task Estimations Service with Zod validation
 *
 * This service extends the base APIService to add schema validation
 * for all API responses, ensuring data integrity and type safety.
 */
class TaskEstimationsService extends APIService {
	addTaskEstimation = async (data: TCreateTaskEstimation) => {
		try {
			validateApiResponse(createTaskEstimationSchema, data, 'addTaskEstimation input data');

			const response = await this.post<TTaskEstimation>('/task-estimation', data, {
				tenantId: this.tenantId
			});

			// Validate the response data
			return validateApiResponse(taskEstimationsSchema, response.data, 'addTaskEstimation API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Estimation creation validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'TaskEstimationsService'
				);
			}
			throw error;
		}
	};

	editTaskEstimation = async (data: TTaskEstimation) => {
		try {
			validateApiResponse(taskEstimationsSchema, data, 'editTaskEstimation input data');

			const response = await this.put<TTaskEstimation>(`/task-estimation/${data.id}`, data, {
				tenantId: this.tenantId
			});

			// Validate the response data
			return validateApiResponse(taskEstimationsSchema, response.data, 'editTaskEstimation API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Estimation update validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'TaskEstimationsService'
				);
			}
			throw error;
		}
	};

	deleteTaskEstimation = async (estimationId: string) => {
		try {
			const response = await this.delete(`/task-estimation/${estimationId}`, { tenantId: this.tenantId });

			return response.data;
		} catch (error) {
			throw error;
		}
	};
}

export const taskEstimationsService = new TaskEstimationsService(GAUZY_API_BASE_SERVER_URL.value);
