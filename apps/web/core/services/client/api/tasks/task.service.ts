import { getActiveProjectIdCookie } from '@/core/lib/helpers/cookies';
import { APIService, getFallbackAPI } from '../../api.service';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { DeleteResponse, PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { createTaskSchema, taskSchema, TCreateTask, TTask } from '@/core/types/schemas/task/task.schema';
import { TEmployee } from '@/core/types/schemas';
import { zodStrictApiResponseValidate, zodStrictPaginationResponseValidate } from '@/core/lib/validation/zod-validators';

/**
 * Enhanced Task Service with Zod validation
 *
 * This service extends the base APIService to add schema validation
 * for all API responses, ensuring data integrity and type safety.
 */
class TaskService extends APIService {
	get baseRelations() {
		return [
			'tags',
			'teams',
			'members',
			'members.user',
			'createdByUser',
			'linkedIssues',
			'linkedIssues.taskTo',
			'linkedIssues.taskFrom',
			'parent',
			'children',
			'estimations'
		];
	}

	get baseQueries() {
		return {
			'where[organizationId]': this.organizationId,
			'where[tenantId]': this.tenantId,
			'join[alias]': 'task',
			'join[leftJoinAndSelect][members]': 'task.members',
			'join[leftJoinAndSelect][user]': 'members.user',
			'join[leftJoinAndSelect][estimations]': 'task.estimations',
			...Object.fromEntries(this.baseRelations.map((relation, index) => [`relations[${index}]`, relation]))
		};
	}
	/**
	 * Fetches a single task by its ID with validation
	 *
	 * @param {string} taskId - Task identifier
	 * @returns {Promise<TTask>} - Validated task data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getTaskById = async (taskId: string): Promise<TTask> => {
		const query = qs.stringify({ ...this.baseQueries, includeRootEpic: 'true' });
		const endpoint = GAUZY_API_BASE_SERVER_URL.value ? `/tasks/${taskId}?${query}` : `/tasks/${taskId}`;

		return this.executeWithValidation(
			() => this.get<TTask>(endpoint),
			(data) => zodStrictApiResponseValidate(taskSchema, data, 'getTaskById API response'),
			{ method: 'getTaskById', service: 'TaskService', taskId }
		);
	};

	/**
	 * Fetches a paginated list of tasks with validation
	 *
	 * @param {string} projectId - Project identifier
	 * @returns {Promise<PaginationResponse<TTask>>} - Validated paginated tasks data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getTasks = async ({ projectId }: { projectId: string }): Promise<PaginationResponse<TTask>> => {
		const query = qs.stringify({
			...this.baseQueries,
			'where[projectId]': projectId,
			'where[teams][0]': this.activeTeamId
		});
		const endpoint = `/tasks/team?${query}`;

		return this.executeWithPaginationValidation(
			() => this.get<PaginationResponse<TTask>>(endpoint, { tenantId: this.tenantId }),
			(data) => zodStrictPaginationResponseValidate(taskSchema, data, 'getTasks API response'),
			{ method: 'getTasks', service: 'TaskService', projectId, activeTeamId: this.activeTeamId }
		);
	};

	/**
	 * Deletes a task by its ID with validation
	 *
	 * @param {string} taskId - Task identifier
	 * @returns {Promise<DeleteResponse>} - Delete operation response
	 */
	deleteTask = async (taskId: string): Promise<DeleteResponse> => {
		const response = await this.delete<DeleteResponse>(`/tasks/${taskId}`);
		return response.data;
	};

	/**
	 * Determines the type of member based on its structure
	 */
	private getMemberType(member: TEmployee): 'DirectEmployee' | 'OrganizationTeamEmployee' {
		return member?.employeeId ? 'OrganizationTeamEmployee' : 'DirectEmployee';
	}

	/**
	 * Normalizes a DirectEmployee member structure
	 */
	private normalizeDirectEmployee(member: TEmployee, index: number): TEmployee | null {
		const userId = member?.userId || member?.user?.id;
		if (!userId) {
			console.warn(`❌ Direct Employee at index ${index} has no userId - filtering out`);
			return null;
		}
		return member;
	}

	/**
	 * Normalizes an OrganizationTeamEmployee member to userId-based structure
	 */
	private normalizeOrganizationTeamEmployee(member: TEmployee, index: number): TEmployee | null {
		const userId = member?.employee?.user?.id;
		if (!userId) {
			console.warn(`❌ OrganizationTeamEmployee at index ${index} has no user.id - filtering out`);
			return null;
		}

		return {
			...member?.employee,
			userId,
			user: member?.employee?.user,
			// Preserve OrganizationTeamEmployee properties
			organizationTeamId: member?.organizationTeamId,
			isManager: member?.isManager,
			isTrackingEnabled: member?.isTrackingEnabled
		} as TEmployee;
	}

	/**
	 * Normalizes task members to ensure consistent userId-based structure
	 */
	private normalizeTaskMembers(members: TEmployee[]): TEmployee[] {
		if (!members?.length) return [];

		return members
			.map((member, index) => {
				const memberType = this.getMemberType(member);

				return memberType === 'DirectEmployee'
					? this.normalizeDirectEmployee(member, index)
					: this.normalizeOrganizationTeamEmployee(member, index);
			})
			.filter(Boolean) as TEmployee[];
	}
	/**
	 * Updates an existing task with validation
	 *
	 * @param {string} taskId - Task identifier
	 * @param {Partial<TTask>} body - Partial task update data
	 * @returns {Promise<PaginationResponse<TTask>>} - Updated tasks list or single task response
	 * @throws ValidationError if input or response data doesn't match schema
	 */

	updateTask = async ({ taskId, data }: { taskId: string; data: Partial<TTask> }): Promise<TTask> => {
		const cleanedData: Partial<TTask> = { ...data };

		if ('members' in data) {
			cleanedData.members = this.normalizeTaskMembers(data.members ?? []);
		}

		const validatedInput = zodStrictApiResponseValidate(
			taskSchema.partial(),
			cleanedData,
			'updateTask input data'
		) as Partial<TTask>;

		if (GAUZY_API_BASE_SERVER_URL.value) {
			const nBody = { ...validatedInput };
			delete nBody.selectedTeam;
			delete nBody.rootEpic;

			return this.executeWithValidation(
				() => this.put<TTask>(`/tasks/${taskId}`, nBody),
				(data) => zodStrictApiResponseValidate(taskSchema, data, 'updateTask API response'),
				{ method: 'updateTask', service: 'TaskService', taskId }
			);
		}

		return this.executeWithValidation(
			() => this.put<TTask>(`/tasks/${taskId}`, validatedInput),
			(data) => zodStrictApiResponseValidate(taskSchema, data, 'updateTask API response'),
			{ method: 'updateTask', service: 'TaskService', taskId }
		);
	};

	/**
	 * Creates a new task with validation
	 *
	 * @param {Partial<TCreateTask> & { title: string }} body - New task data
	 * @returns {Promise<PaginationResponse<TTask>>} - Created task or updated tasks list
	 * @throws ValidationError if input or response data doesn't match schema
	 */
	createTask = async (body: Partial<TCreateTask> & { title: string }): Promise<PaginationResponse<TTask>> => {
		if (GAUZY_API_BASE_SERVER_URL.value) {
			const organizationId = this.organizationId;
			const teamId = this.activeTeamId;
			const tenantId = this.tenantId;
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
				title
			};

			const validatedInput = zodStrictApiResponseValidate(
				createTaskSchema,
				datas,
				'createTask input data'
			) as TCreateTask;

			await this.post('/tasks', validatedInput, { tenantId });

			return this.getTasks({ projectId });
		}

		const api = await getFallbackAPI();
		return this.executeWithPaginationValidation(
			() => api.post<PaginationResponse<TTask>>('/tasks/team', body),
			(data) => zodStrictPaginationResponseValidate(taskSchema, data, 'createTask API response'),
			{ method: 'createTask', service: 'TaskService' }
		);
	};

	/**
	 * Deletes an employee from tasks with validation
	 *
	 * @param {string} employeeId - Employee identifier
	 * @returns {Promise<DeleteResponse>} - Delete operation response
	 */
	deleteEmployeeFromTasks = async (employeeId: string): Promise<DeleteResponse> => {
		const response = await this.delete<DeleteResponse>(
			`/tasks/employee/${employeeId}?organizationTeamId=${this.activeTeamId}`
		);
		return response.data;
	};

	/**
	 * Fetches tasks by employee ID with validation
	 *
	 * @param {string} employeeId - Employee identifier
	 * @returns {Promise<TTask[]>} - Validated array of tasks
	 * @throws ValidationError if response data doesn't match schema
	 */
	getTasksByEmployeeId = async ({ employeeId }: { employeeId: string }): Promise<TTask[]> => {
		const obj = {
			'where[tenantId]': this.tenantId,
			'where[organizationId]': this.organizationId,
			'teams[0]': this.activeTeamId
		} as Record<string, string>;
		const query = qs.stringify(obj);

		return this.executeWithValidation(
			() => this.get<TTask[]>(`/tasks/employee/${employeeId}?${query}`),
			(data) => data.map((task: any) =>
				zodStrictApiResponseValidate(taskSchema, task, 'getTasksByEmployeeId API response')
			),
			{ method: 'getTasksByEmployeeId', service: 'TaskService', employeeId, activeTeamId: this.activeTeamId }
		);
	};
}

export const taskService = new TaskService(GAUZY_API_BASE_SERVER_URL.value);
