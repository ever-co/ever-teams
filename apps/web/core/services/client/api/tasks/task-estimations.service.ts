import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { APIService } from '../../api.service';
import { validateApiResponse } from '@/core/types/schemas';
import {
	createTaskEstimationSchema,
	taskEstimationsSchema,
	TCreateTaskEstimation,
	TTaskEstimation
} from '@/core/types/schemas/task/task-estimation.schema';

/**
 * Task Estimations Service with Zod validation
 *
 * This service extends the base APIService to add schema validation
 * for all API responses, ensuring data integrity and type safety.
 */
class TaskEstimationsService extends APIService {
	addTaskEstimation = async (data: TCreateTaskEstimation) => {
		const validatedInput = validateApiResponse(createTaskEstimationSchema, data, 'addTaskEstimation input data');

		return this.executeWithValidation(
			() => this.post<TTaskEstimation>('/task-estimation', validatedInput, { tenantId: this.tenantId }),
			(responseData) => validateApiResponse(taskEstimationsSchema, responseData, 'addTaskEstimation API response'),
			{ method: 'addTaskEstimation', service: 'TaskEstimationsService' }
		);
	};

	editTaskEstimation = async (data: TTaskEstimation) => {
		const validatedInput = validateApiResponse(taskEstimationsSchema, data, 'editTaskEstimation input data');

		return this.executeWithValidation(
			() => this.put<TTaskEstimation>(`/task-estimation/${data.id}`, validatedInput, { tenantId: this.tenantId }),
			(responseData) => validateApiResponse(taskEstimationsSchema, responseData, 'editTaskEstimation API response'),
			{ method: 'editTaskEstimation', service: 'TaskEstimationsService', estimationId: data.id }
		);
	};

	deleteTaskEstimation = async (estimationId: string) => {
		const response = await this.delete(`/task-estimation/${estimationId}`, { tenantId: this.tenantId });

		return response.data;
	};
}

export const taskEstimationsService = new TaskEstimationsService(GAUZY_API_BASE_SERVER_URL.value);
