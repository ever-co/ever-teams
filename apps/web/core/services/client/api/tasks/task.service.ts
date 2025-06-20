import {
	getActiveProjectIdCookie,
	getActiveTeamIdCookie,
	getOrganizationIdCookie,
	getTenantIdCookie
} from '@/core/lib/helpers/cookies';
import { APIService, getFallbackAPI } from '../../api.service';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { DeleteResponse, PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { ITask } from '@/core/types/interfaces/task/task';
import taskSchema, { createTaskSchema, TCreateTask, TTask } from '@/core/types/schemas/task/task.schema';
import { validateApiResponse, validatePaginationResponse, ZodValidationError } from '@/core/types/schemas';

/**
 * Enhanced Task Service with Zod validation
 *
 * This service extends the base APIService to add schema validation
 * for all API responses, ensuring data integrity and type safety.
 */
class TaskService extends APIService {
	/**
	 * Fetches a single task by its ID with validation
	 *
	 * @param {string} taskId - Task identifier
	 * @returns {Promise<TTask>} - Validated task data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getTaskById = async (taskId: string): Promise<TTask> => {
		try {
			const organizationId = getOrganizationIdCookie();
			const tenantId = getTenantIdCookie();

			const relations = [
				'tags',
				'teams',
				'members',
				'members.user',
				'createdByUser',
				'linkedIssues',
				'linkedIssues.taskTo',
				'linkedIssues.taskFrom',
				'parent',
				'children'
			];

			const obj = {
				'where[organizationId]': organizationId,
				'where[tenantId]': tenantId,
				'join[alias]': 'task',
				'join[leftJoinAndSelect][members]': 'task.members',
				'join[leftJoinAndSelect][user]': 'members.user',
				includeRootEpic: 'true'
			} as Record<string, string>;

			relations.forEach((rl, i) => {
				obj[`relations[${i}]`] = rl;
			});

			const query = qs.stringify(obj);

			const endpoint = GAUZY_API_BASE_SERVER_URL.value ? `/tasks/${taskId}?${query}` : `/tasks/${taskId}`;

			const response = await this.get<ITask>(endpoint);

			// Validate the response data using Zod schema
			return validateApiResponse(taskSchema, response.data, 'getTaskById API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Task by ID validation failed:',
					{
						message: error.message,
						issues: error.issues,
						taskId
					},
					'TaskService'
				);
			}
			throw error;
		}
	};

	/**
	 * Fetches a paginated list of tasks with validation
	 *
	 * @param {string} organizationId - Organization identifier
	 * @param {string} tenantId - Tenant identifier
	 * @param {string} projectId - Project identifier
	 * @param {string} teamId - Team identifier
	 * @returns {Promise<PaginationResponse<TTask>>} - Validated paginated tasks data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getTasks = async (
		organizationId: string,
		tenantId: string,
		projectId: string,
		teamId: string
	): Promise<PaginationResponse<TTask>> => {
		try {
			const relations = [
				'tags',
				'teams',
				'members',
				'members.user',
				'createdByUser',
				'linkedIssues',
				'linkedIssues.taskTo',
				'linkedIssues.taskFrom',
				'parent',
				'children'
			];

			const obj = {
				'where[organizationId]': organizationId,
				'where[tenantId]': tenantId,
				'where[projectId]': projectId,
				'join[alias]': 'task',
				'join[leftJoinAndSelect][members]': 'task.members',
				'join[leftJoinAndSelect][user]': 'members.user',
				'where[teams][0]': teamId
			} as Record<string, string>;

			relations.forEach((rl, i) => {
				obj[`relations[${i}]`] = rl;
			});

			const query = qs.stringify(obj);
			const endpoint = `/tasks/team?${query}`;

			const response = await this.get<PaginationResponse<ITask>>(endpoint, { tenantId });

			// Validate the response data using Zod schema
			return validatePaginationResponse(taskSchema, response.data, 'getTasks API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Tasks validation failed:',
					{
						message: error.message,
						issues: error.issues,
						organizationId,
						tenantId,
						projectId,
						teamId
					},
					'TaskService'
				);
			}
			throw error;
		}
	};

	/**
	 * Deletes a task by its ID with validation
	 *
	 * @param {string} taskId - Task identifier
	 * @returns {Promise<DeleteResponse>} - Delete operation response
	 */
	deleteTask = async (taskId: string): Promise<DeleteResponse> => {
		try {
			const response = await this.delete<DeleteResponse>(`/tasks/${taskId}`);

			// Note: Delete operations typically return a simple response, not the deleted entity
			// So we don't validate against task schema here
			return response.data;
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Task deletion validation failed:',
					{
						message: error.message,
						issues: error.issues,
						taskId
					},
					'TaskService'
				);
			}
			throw error;
		}
	};

	/**
	 * Updates an existing task with validation
	 *
	 * @param {string} taskId - Task identifier
	 * @param {Partial<TTask>} body - Partial task update data
	 * @returns {Promise<PaginationResponse<TTask>>} - Updated tasks list or single task response
	 * @throws ValidationError if input or response data doesn't match schema
	 */
	updateTask = async (taskId: string, body: Partial<TTask>): Promise<PaginationResponse<TTask>> => {
		try {
			// Validate input data before sending (partial validation)
			const validatedInput = validateApiResponse(
				taskSchema.partial(),
				body,
				'updateTask input data'
			) as Partial<TTask>;

			if (GAUZY_API_BASE_SERVER_URL.value) {
				const tenantId = getTenantIdCookie();
				const organizationId = getOrganizationIdCookie();
				const teamId = getActiveTeamIdCookie();
				const projectId = getActiveProjectIdCookie();

				const nBody = { ...validatedInput };
				delete nBody.selectedTeam;
				delete nBody.rootEpic;

				await this.put(`/tasks/${taskId}`, nBody);

				return this.getTasks(organizationId, tenantId, projectId, teamId);
			}

			const response = await this.put<PaginationResponse<ITask>>(`/tasks/${taskId}`, validatedInput);

			// Validate the response data
			return validatePaginationResponse(taskSchema, response.data, 'updateTask API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Task update validation failed:',
					{
						message: error.message,
						issues: error.issues,
						taskId
					},
					'TaskService'
				);
			}
			throw error;
		}
	};

	/**
	 * Creates a new task with validation
	 *
	 * @param {Partial<TCreateTask> & { title: string }} body - New task data
	 * @returns {Promise<PaginationResponse<TTask>>} - Created task or updated tasks list
	 * @throws ValidationError if input or response data doesn't match schema
	 */
	createTask = async (body: Partial<TCreateTask> & { title: string }): Promise<PaginationResponse<TTask>> => {
		try {
			if (GAUZY_API_BASE_SERVER_URL.value) {
				const organizationId = getOrganizationIdCookie();
				const teamId = getActiveTeamIdCookie();
				const tenantId = getTenantIdCookie();
				const projectId = getActiveProjectIdCookie();
				const title = body.title.trim() || '';

				const datas: TCreateTask = {
					description: '',
					teams: [
						{
							id: teamId
						}
					],
					tags: [],
					organizationId,
					tenantId,
					projectId,
					estimate: 0,
					...body,
					title // this must be called after ...body
				};

				// Validate input data before sending
				const validatedInput = validateApiResponse(
					createTaskSchema,
					datas,
					'createTask input data'
				) as TCreateTask;

				await this.post('/tasks', validatedInput, { tenantId });

				return this.getTasks(organizationId, tenantId, projectId, teamId);
			}

			const api = await getFallbackAPI();
			const response = await api.post<PaginationResponse<ITask>>('/tasks/team', body);

			// Validate the response data
			return validatePaginationResponse(taskSchema, response.data, 'createTask API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Task creation validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'TaskService'
				);
			}
			throw error;
		}
	};

	/**
	 * Deletes an employee from tasks with validation
	 *
	 * @param {string} employeeId - Employee identifier
	 * @param {string} organizationTeamId - Organization team identifier
	 * @returns {Promise<DeleteResponse>} - Delete operation response
	 */
	deleteEmployeeFromTasks = async (employeeId: string, organizationTeamId: string): Promise<DeleteResponse> => {
		try {
			const response = await this.delete<DeleteResponse>(
				`/tasks/employee/${employeeId}?organizationTeamId=${organizationTeamId}`
			);
			return response.data;
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Delete employee from tasks validation failed:',
					{
						message: error.message,
						issues: error.issues,
						employeeId,
						organizationTeamId
					},
					'TaskService'
				);
			}
			throw error;
		}
	};

	/**
	 * Fetches tasks by employee ID with validation
	 *
	 * @param {string} employeeId - Employee identifier
	 * @param {string} organizationTeamId - Organization team identifier
	 * @returns {Promise<TTask[]>} - Validated array of tasks
	 * @throws ValidationError if response data doesn't match schema
	 */
	getTasksByEmployeeId = async (employeeId: string, organizationTeamId: string): Promise<TTask[]> => {
		try {
			const organizationId = getOrganizationIdCookie();
			const obj = {
				'where[organizationTeamId]': organizationTeamId,
				'where[organizationId]': organizationId
			} as Record<string, string>;
			const query = qs.stringify(obj);

			const response = await this.get<ITask[]>(`/tasks/employee/${employeeId}?${query}`);

			// Validate the response data using Zod schema
			return response.data.map((task: any) =>
				validateApiResponse(taskSchema, task, 'getTasksByEmployeeId API response')
			);
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Tasks by employee ID validation failed:',
					{
						message: error.message,
						issues: error.issues,
						employeeId,
						organizationTeamId
					},
					'TaskService'
				);
			}
			throw error;
		}
	};
}

export const taskService = new TaskService(GAUZY_API_BASE_SERVER_URL.value);
