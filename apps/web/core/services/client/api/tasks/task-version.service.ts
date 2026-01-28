// Removed cookie imports as they are now handled by the base APIService class
import { APIService } from '../../api.service';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import {
	validatePaginationResponse,
	taskVersionSchema,
	validateApiResponse,
	taskVersionCreateSchema,
	taskVersionUpdateSchema,
	TTaskVersion,
	TTaskVersionCreate,
	TTaskVersionUpdate,
	updateTaskVersionResultSchema,
	deleteTaskVersionResultSchema
} from '@/core/types/schemas';

/**
 * Enhanced Task Version Service with Zod validation
 *
 * This service extends the base APIService to add schema validation
 * for all API responses, ensuring data integrity and type safety.
 */
class TaskVersionService extends APIService {
	/**
	 * Create a new task version with validation
	 *
	 * @param data - Task version data without ID
	 * @returns Promise<TTaskVersion> - Validated created task version
	 * @throws ValidationError if response data doesn't match schema
	 */
	createTaskVersion = async (data: TTaskVersionCreate): Promise<TTaskVersion> => {
		const validatedInput = validateApiResponse(taskVersionCreateSchema, data, 'createTaskVersion input data');

		return this.executeWithValidation(
			() => this.post<TTaskVersion>(`/task-versions`, validatedInput, { tenantId: this.tenantId }),
			(responseData) => validateApiResponse(taskVersionSchema, responseData, 'createTaskVersion API response'),
			{ method: 'createTaskVersion', service: 'TaskVersionService' }
		);
	};

	/**
	 * Update a task version with validation
	 *
	 * @param taskVersionId - Task version ID to update
	 * @param data - Partial task version data
	 * @throws ValidationError if response data doesn't match schema
	 */
	updateTaskVersion = async ({ taskVersionId, data }: { taskVersionId: string; data: TTaskVersionUpdate }) => {
		const validatedInput = validateApiResponse(taskVersionUpdateSchema, data, 'updateTaskVersion input data');

		return this.executeWithValidation(
			() => this.put(`/task-versions/${taskVersionId}`, validatedInput, { tenantId: this.tenantId }),
			(responseData) => validateApiResponse(updateTaskVersionResultSchema, responseData, 'updateTaskVersion API response'),
			{ method: 'updateTaskVersion', service: 'TaskVersionService', taskVersionId }
		);
	};

	/**
	 * Delete a task version with validation
	 *
	 * @param taskVersionId - Task version ID to delete
	 * @throws ValidationError if response data doesn't match schema
	 */
	deleteTaskVersion = async (taskVersionId: string) => {
		return this.executeWithValidation(
			() => this.delete(`/task-versions/${taskVersionId}`, { tenantId: this.tenantId }),
			(data) => validateApiResponse(deleteTaskVersionResultSchema, data, 'deleteTaskVersion API response'),
			{ method: 'deleteTaskVersion', service: 'TaskVersionService', taskVersionId }
		);
	};

	/**
	 * Get all task versions with validation
	 *
	 * @returns Promise<PaginationResponse<TTaskVersion>> - Validated task versions data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getTaskVersions = async (): Promise<PaginationResponse<TTaskVersion>> => {
		const query = qs.stringify(this.activeTeamBasedQueries);
		const endpoint = `/task-versions?${query}`;

		return this.executeWithPaginationValidation(
			() => this.get<PaginationResponse<TTaskVersion>>(endpoint, { tenantId: this.tenantId }),
			(data) => validatePaginationResponse(taskVersionSchema, data, 'getTaskVersions API response'),
			{ method: 'getTaskVersions', service: 'TaskVersionService' }
		);
	};
}

export const taskVersionService = new TaskVersionService(GAUZY_API_BASE_SERVER_URL.value);
