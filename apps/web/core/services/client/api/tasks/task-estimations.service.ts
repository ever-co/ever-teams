import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { APIService } from '../../api.service';
import { taskEstimationsSchema, TTaskEstimations } from '@/core/types/schemas/task/task.schema';
import { validateApiResponse, ZodValidationError } from '@/core/types/schemas';

/**
 * Task Estimations Service with Zod validation
 *
 * This service extends the base APIService to add schema validation
 * for all API responses, ensuring data integrity and type safety.
 */
class TaskEstimationsService extends APIService {
	addEstimation = async (data: TTaskEstimations) => {
		try {
			const response = await this.post<TTaskEstimations>('/task-estimations', data, {
				tenantId: this.tenantId
			});

			// Validate the response data
			return validateApiResponse(taskEstimationsSchema, response.data, 'addEstimation API response');
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

	editEstimation = async (data: TTaskEstimations) => {
		try {
			const response = await this.put<TTaskEstimations>(`/task-estimations/${data.id}`, data, {
				tenantId: this.tenantId
			});

			// Validate the response data
			return validateApiResponse(taskEstimationsSchema, response.data, 'editEstimation API response');
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
}

export const taskEstimationsService = new TaskEstimationsService(GAUZY_API_BASE_SERVER_URL.value);
