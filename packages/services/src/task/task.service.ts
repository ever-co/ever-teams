// api service
import { EVER_TEAMS_API_BASE_URL } from '@ever-teams/constants';
import { APIService } from '../api.service';

/**
 * Service class for managing tasks within Ever Teams.
 *
 * Provides CRUD operations for tasks.
 *
 * @class
 * @extends {APIService}
 */
export class TaskService extends APIService {
	/**
	 * Initializes the TaskService with a specified or default API base URL.
	 *
	 * @param {string} [baseURL] - Optional override for the default API base URL.
	 */
	constructor(baseURL: string = EVER_TEAMS_API_BASE_URL) {
		super(baseURL);
	}

	/**
	 * Fetches a paginated list of tasks, optionally filtered.
	 *
	 * @param {object} [params] - Optional filters (e.g., projectId, status, search term).
	 * @returns {Promise<PaginatedResponse<ITask>>}
	 */
	async fetchTasks(params?: Record<string, any>) {
		try {
			const response = await this.get<any>('/api/tasks/', { params });
			return response.data;
		} catch (error: any) {
			throw error?.response?.data || error;
		}
	}

	/**
	 * Fetches a single task by its ID.
	 *
	 * @param {string} taskId - Task identifier.
	 * @returns {Promise<ITask>}
	 */
	async fetchTaskById(taskId: string) {
		try {
			const response = await this.get<any>(`/api/tasks/${taskId}/`);
			return response.data;
		} catch (error: any) {
			throw error?.response?.data || error;
		}
	}

	/**
	 * Creates a new task.
	 *
	 * @param {CreateTaskDTO} data - New task data.
	 * @returns {Promise<any>}
	 */
	async createTask(data: any) {
		try {
			const response = await this.post<any>('/api/tasks/', data);
			return response.data;
		} catch (error: any) {
			throw error?.response?.data || error;
		}
	}

	/**
	 * Updates an existing task.
	 *
	 * @param {string} taskId - Task identifier.
	 * @param {UpdateTaskDTO} data - Partial task update data.
	 * @returns {Promise<any>}
	 */
	async updateTask(taskId: string, data: any) {
		try {
			const response = await this.patch<any>(`/api/tasks/${taskId}/`, data);
			return response.data;
		} catch (error: any) {
			throw error?.response?.data || error;
		}
	}

	/**
	 * Deletes a task by its ID.
	 *
	 * @param {string} taskId - Task identifier.
	 * @returns {Promise<void>}
	 */
	async deleteTask(taskId: string): Promise<void> {
		try {
			await this.delete<void>(`/api/tasks/${taskId}/`);
		} catch (error: any) {
			throw error?.response?.data || error;
		}
	}
}
