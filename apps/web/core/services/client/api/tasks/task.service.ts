import { getActiveProjectIdCookie } from '@/core/lib/helpers/cookies';
import { APIService, getFallbackAPI } from '../../api.service';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { DeleteResponse, PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { createTaskSchema, taskSchema, TCreateTask, TTask } from '@/core/types/schemas/task/task.schema';
import { validateApiResponse, validatePaginationResponse, ZodValidationError } from '@/core/types/schemas';

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
		try {
			const query = qs.stringify({ ...this.baseQueries, includeRootEpic: 'true' });

			const endpoint = GAUZY_API_BASE_SERVER_URL.value ? `/tasks/${taskId}?${query}` : `/tasks/${taskId}`;

			const response = await this.get<TTask>(endpoint);

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
	 * @param {string} projectId - Project identifier
	 * @returns {Promise<PaginationResponse<TTask>>} - Validated paginated tasks data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getTasks = async ({ projectId }: { projectId: string }): Promise<PaginationResponse<TTask>> => {
		try {
			const query = qs.stringify({
				...this.baseQueries,
				'where[projectId]': projectId,
				'where[teams][0]': this.activeTeamId
			});
			const endpoint = `/tasks/team?${query}`;

			const response = await this.get<PaginationResponse<TTask>>(endpoint, { tenantId: this.tenantId });

			// Validate the response data using Zod schema
			return validatePaginationResponse(taskSchema, response.data, 'getTasks API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Tasks validation failed:',
					{
						message: error.message,
						issues: error.issues,
						organizationId: this.organizationId,
						tenantId: this.tenantId,
						projectId,
						activeTeamId: this.activeTeamId
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

	updateTask = async ({ taskId, data }: { taskId: string; data: Partial<TTask> }): Promise<TTask> => {
		try {
			console.log('🔍 updateTask - Raw input data:', {
				taskId,
				hasMembers: !!data.members,
				membersCount: data.members?.length || 0,
				members: data.members?.map((member, index) => ({
					index,
					employeeId: (member as any)?.employeeId,
					hasEmployee: !!member?.employee,
					memberType: (member as any)?.employeeId ? 'OrganizationTeamEmployee' : 'DirectEmployee'
				}))
			});

			// 🛡️ SOLUTION: Normalize member structure to use consistent userId-based format
			let cleanedMembers: any[] = [];

			if (data.members && data.members.length > 0) {
				console.log('🔧 Normalizing member structure to prevent FK constraint violations...');

				for (const [index, member] of data.members.entries()) {
					const memberType = (member as any)?.employeeId ? 'OrganizationTeamEmployee' : 'DirectEmployee';

					console.log(`🔍 Processing ${memberType} at index ${index}:`, {
						memberId: (member as any)?.id,
						employeeId: (member as any)?.employeeId,
						userId: (member as any)?.userId || (member as any)?.user?.id
					});

					if (memberType === 'DirectEmployee') {
						// Direct Employee: already has userId, keep as is
						const userId = (member as any)?.userId || (member as any)?.user?.id;
						if (userId) {
							console.log(`✅ Direct Employee has userId ${userId} - keeping member`);
							cleanedMembers.push(member);
						} else {
							console.warn(`❌ Direct Employee at index ${index} has no userId - filtering out`);
						}
					} else {
						// OrganizationTeamEmployee: convert to userId-based structure
						const userId = (member as any)?.employee?.user?.id;
						if (userId) {
							console.log(`🔄 Converting OrganizationTeamEmployee to userId-based structure: ${userId}`);
							// Transform to match Direct Employee structure
							const normalizedMember = {
								...(member as any)?.employee, // Use employee data as base
								userId: userId,
								user: (member as any)?.employee?.user,
								// Keep some OrganizationTeamEmployee properties that might be needed
								organizationTeamId: (member as any)?.organizationTeamId,
								isManager: (member as any)?.isManager,
								isTrackingEnabled: (member as any)?.isTrackingEnabled
							};
							cleanedMembers.push(normalizedMember);
						} else {
							console.warn(
								`❌ OrganizationTeamEmployee at index ${index} has no user.id - filtering out`
							);
						}
					}
				}
			}

			// Prepare cleaned data
			const cleanedData = {
				...data,
				members: cleanedMembers
			};

			console.log('🧹 updateTask - After employee verification:', {
				originalCount: data.members?.length || 0,
				cleanedCount: cleanedMembers.length,
				filteredOut: (data.members?.length || 0) - cleanedMembers.length
			});

			// Validate input data before sending (partial validation)
			/* const validatedInput = validateApiResponse(
				taskSchema.partial(),
				cleanedData,
				'updateTask input data'
			) as Partial<TTask>; */
			console.log('<=== cleanedData ===>', cleanedData);
			if (GAUZY_API_BASE_SERVER_URL.value) {
				const nBody = { ...cleanedData };
				delete nBody.selectedTeam;
				delete nBody.rootEpic;

				const response = await this.put<TTask>(`/tasks/${taskId}`, nBody);

				return validateApiResponse(taskSchema, response.data, 'updateTask API response');
			}

			const response = await this.put<TTask>(`/tasks/${taskId}`, cleanedData);

			// Validate the response data
			return validateApiResponse(taskSchema, response.data, 'updateTask API response');
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
					title // this must be called after ...body
				};

				// Validate input data before sending
				const validatedInput = validateApiResponse(
					createTaskSchema,
					datas,
					'createTask input data'
				) as TCreateTask;

				await this.post('/tasks', validatedInput, { tenantId });

				return this.getTasks({ projectId });
			}

			const api = await getFallbackAPI();
			const response = await api.post<PaginationResponse<TTask>>('/tasks/team', body);

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
	 * @returns {Promise<DeleteResponse>} - Delete operation response
	 */
	deleteEmployeeFromTasks = async (employeeId: string): Promise<DeleteResponse> => {
		try {
			const response = await this.delete<DeleteResponse>(
				`/tasks/employee/${employeeId}?organizationTeamId=${this.activeTeamId}`
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
						activeTeamId: this.activeTeamId
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
	 * @returns {Promise<TTask[]>} - Validated array of tasks
	 * @throws ValidationError if response data doesn't match schema
	 */
	getTasksByEmployeeId = async ({ employeeId }: { employeeId: string }): Promise<TTask[]> => {
		try {
			const organizationId = this.organizationId;
			const tenantId = this.tenantId;
			const obj = {
				'where[tenantId]': tenantId,
				'where[organizationId]': organizationId,
				'teams[0]': this.activeTeamId
			} as Record<string, string>;
			const query = qs.stringify(obj);

			const response = await this.get<TTask[]>(`/tasks/employee/${employeeId}?${query}`);

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
						activeTeamId: this.activeTeamId
					},
					'TaskService'
				);
			}
			throw error;
		}
	};
}

export const taskService = new TaskService(GAUZY_API_BASE_SERVER_URL.value);
