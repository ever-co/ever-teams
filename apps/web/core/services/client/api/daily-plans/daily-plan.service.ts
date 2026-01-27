import { APIService } from '../../api.service';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { DeleteResponse, PaginationResponse } from '@/core/types/interfaces/common/data-response';

import {
	dailyPlanSchema,
	createDailyPlanSchema,
	updateDailyPlanSchema,
	dailyPlanTasksUpdateSchema,
	TDailyPlan,
	TCreateDailyPlan,
	TUpdateDailyPlan,
	TDailyPlanTasksUpdate,
	TRemoveTaskFromPlansRequest
} from '@/core/types/schemas';
import {
	zodStrictApiResponseValidate,
	zodStrictPaginationResponseValidate
} from '@/core/lib/validation/zod-validators';

/**
 * Enhanced Daily Plan Service with Zod validation
 *
 * This service extends the base APIService to add schema validation
 * for all API responses, ensuring data integrity and type safety.
 */
class DailyPlanService extends APIService {
	/**
	 * Get all daily plans with validation
	 *
	 * @returns Promise<PaginationResponse<TDailyPlan>> - Validated daily plans data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getAllDayPlans = async (): Promise<PaginationResponse<TDailyPlan>> => {
		const relations = ['employee', 'tasks', 'employee.user', 'tasks.members', 'tasks.members.user'];

		const obj = {
			'where[organizationId]': this.organizationId,
			'where[tenantId]': this.tenantId,
			'where[organizationTeamId]': this.activeTeamId
		} as Record<string, string>;

		relations.forEach((relation, i) => {
			obj[`relations[${i}]`] = relation;
		});

		const query = qs.stringify(obj);

		return this.executeWithPaginationValidation(
			() => this.get<PaginationResponse<TDailyPlan>>(`/daily-plan?${query}`, { tenantId: this.tenantId }),
			(data) => zodStrictPaginationResponseValidate(dailyPlanSchema, data, 'getAllDayPlans API response'),
			{ method: 'getAllDayPlans', service: 'DailyPlanService' }
		);
	};

	/**
	 * Get my daily plans with validation
	 *
	 * @returns Promise<PaginationResponse<TDailyPlan>> - Validated daily plans data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getMyDailyPlans = async (): Promise<PaginationResponse<TDailyPlan>> => {
		const relations = ['employee', 'tasks', 'employee.user', 'tasks.members', 'tasks.members.user'];

		const obj = {
			'where[organizationId]': this.organizationId,
			'where[tenantId]': this.tenantId,
			'where[organizationTeamId]': this.activeTeamId
		} as Record<string, string>;

		relations.forEach((relation, i) => {
			obj[`relations[${i}]`] = relation;
		});

		const query = qs.stringify(obj);

		return this.executeWithPaginationValidation(
			() => this.get<PaginationResponse<TDailyPlan>>(`/daily-plan/me?${query}`, { tenantId: this.tenantId }),
			(data) => zodStrictPaginationResponseValidate(dailyPlanSchema, data, 'getMyDailyPlans API response'),
			{ method: 'getMyDailyPlans', service: 'DailyPlanService' }
		);
	};

	/**
	 * Get daily plans by employee with validation
	 *
	 * @param employeeId - Employee ID to get plans for
	 * @returns Promise<PaginationResponse<TDailyPlan>> - Validated daily plans data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getDayPlansByEmployee = async ({ employeeId }: { employeeId: string }): Promise<PaginationResponse<TDailyPlan>> => {
		const relations = ['employee', 'tasks', 'employee.user', 'tasks.members', 'tasks.members.user'];

		const obj = {
			'where[organizationId]': this.organizationId,
			'where[tenantId]': this.tenantId,
			'where[organizationTeamId]': this.activeTeamId
		} as Record<string, string>;

		relations.forEach((relation, i) => {
			obj[`relations[${i}]`] = relation;
		});

		const query = qs.stringify(obj);

		return this.executeWithPaginationValidation(
			() => this.get<PaginationResponse<TDailyPlan>>(`/daily-plan/employee/${employeeId}?${query}`, { tenantId: this.tenantId }),
			(data) => zodStrictPaginationResponseValidate(dailyPlanSchema, data, 'getDayPlansByEmployee API response'),
			{ method: 'getDayPlansByEmployee', service: 'DailyPlanService', employeeId }
		);
	};

	/**
	 * Get daily plans by task with validation
	 *
	 * @param taskId - Task ID to get plans for
	 * @returns Promise<PaginationResponse<TDailyPlan>> - Validated daily plans data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getPlansByTask = async ({ taskId }: { taskId: string }): Promise<PaginationResponse<TDailyPlan>> => {
		const obj = {
			'where[organizationId]': this.organizationId,
			'where[tenantId]': this.tenantId,
			'where[organizationTeamId]': this.activeTeamId
		} as Record<string, string>;

		const query = qs.stringify(obj);

		return this.executeWithPaginationValidation(
			() => this.get<PaginationResponse<TDailyPlan>>(`/daily-plan/task/${taskId}?${query}`, { tenantId: this.tenantId }),
			(data) => zodStrictPaginationResponseValidate(dailyPlanSchema, data, 'getPlansByTask API response'),
			{ method: 'getPlansByTask', service: 'DailyPlanService', taskId }
		);
	};

	/**
	 * Get daily plan by its ID with validation
	 *
	 * @param planId - The target plan's ID
	 * @returns Promise<TDailyPlan> - Validated daily plan data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getPlanById = async (planId: string): Promise<TDailyPlan> => {
		return this.executeWithValidation(
			() => this.get<TDailyPlan>(`/daily-plan/${planId}`, { tenantId: this.tenantId }),
			(data) => zodStrictApiResponseValidate(dailyPlanSchema, data, 'getPlanById API response'),
			{ method: 'getPlanById', service: 'DailyPlanService', planId }
		);
	};

	/**
	 * Create a new daily plan with validation
	 *
	 * @param data - Daily plan data without ID
	 * @returns Promise<TDailyPlan> - Validated created daily plan
	 * @throws ValidationError if response data doesn't match schema
	 */
	createDailyPlan = async (data: TCreateDailyPlan): Promise<TDailyPlan> => {
		const validatedInput = zodStrictApiResponseValidate(
			createDailyPlanSchema,
			data,
			'createDailyPlan input data'
		);

		return this.executeWithValidation(
			() => this.post<TDailyPlan>('/daily-plan', validatedInput as Record<string, any>, { tenantId: this.tenantId }),
			(data) => zodStrictApiResponseValidate(dailyPlanSchema, data, 'createDailyPlan API response'),
			{ method: 'createDailyPlan', service: 'DailyPlanService' }
		);
	};

	/**
	 * Update a daily plan with validation
	 *
	 * @param data - Daily plan update data
	 * @param planId - Daily plan ID to update
	 * @returns Promise<TDailyPlan> - Validated updated daily plan
	 * @throws ValidationError if response data doesn't match schema
	 */
	updateDailyPlan = async (data: TUpdateDailyPlan, planId: string): Promise<TDailyPlan> => {
		const validatedInput = zodStrictApiResponseValidate(
			updateDailyPlanSchema,
			data,
			'updateDailyPlan input data'
		);

		return this.executeWithValidation(
			() => this.put<TDailyPlan>(`/daily-plan/${planId}`, validatedInput as Record<string, any>, {}),
			(data) => zodStrictApiResponseValidate(dailyPlanSchema, data, 'updateDailyPlan API response'),
			{ method: 'updateDailyPlan', service: 'DailyPlanService', planId }
		);
	};

	/**
	 * Add task to daily plan with validation
	 *
	 * @param data - Task update data
	 * @param planId - Daily plan ID to add task to
	 * @returns Promise<TDailyPlan> - Validated updated daily plan
	 * @throws ValidationError if response data doesn't match schema
	 */
	addTaskToPlan = async (data: TDailyPlanTasksUpdate, planId: string): Promise<TDailyPlan> => {
		const validatedInput = zodStrictApiResponseValidate(
			dailyPlanTasksUpdateSchema,
			{ organizationId: this.organizationId, ...data },
			'addTaskToPlan input data'
		);

		return this.executeWithValidation(
			() => this.post<TDailyPlan>(`/daily-plan/${planId}/task`, validatedInput as Record<string, any>, { tenantId: this.tenantId }),
			(data) => zodStrictApiResponseValidate(dailyPlanSchema, data, 'addTaskToPlan API response'),
			{ method: 'addTaskToPlan', service: 'DailyPlanService', planId }
		);
	};

	/**
	 * Remove task from daily plan with validation
	 *
	 * @param data - Task update data
	 * @param planId - Daily plan ID to remove task from
	 * @returns Promise<TDailyPlan> - Validated updated daily plan
	 * @throws ValidationError if response data doesn't match schema
	 */
	removeTaskFromPlan = async (data: TRemoveTaskFromPlansRequest, planId: string): Promise<TDailyPlan> => {
		const validatedInput = zodStrictApiResponseValidate(
			dailyPlanTasksUpdateSchema,
			{ organizationId: this.organizationId, ...data },
			'removeManyTaskFromPlans input data'
		);

		return this.executeWithValidation(
			() => this.put<TDailyPlan>(`/daily-plan/${planId}/task`, validatedInput, { tenantId: this.tenantId }),
			(data) => zodStrictApiResponseValidate(dailyPlanSchema, data, 'removeTaskFromPlan API response'),
			{ method: 'removeTaskFromPlan', service: 'DailyPlanService', planId }
		);
	};

	/**
	 * Remove task from many daily plans with validation
	 *
	 * @param params - Object containing taskId and data
	 * @returns Promise<TDailyPlan[]> - Validated updated daily plans
	 * @throws ValidationError if response data doesn't match schema
	 */
	removeManyTaskFromPlans = async ({
		taskId,
		data
	}: {
		taskId: string;
		data: TRemoveTaskFromPlansRequest;
	}): Promise<TDailyPlan[]> => {
		const validatedInput = zodStrictApiResponseValidate(
			dailyPlanTasksUpdateSchema,
			{ organizationId: this.organizationId, ...data },
			'removeManyTaskFromPlans input data'
		);

		return this.executeWithValidation(
			() => this.put<TDailyPlan[]>(`/daily-plan/${taskId}/remove`, validatedInput, { tenantId: this.tenantId }),
			(data) => data.map((plan: any, index: number) =>
				zodStrictApiResponseValidate(
					dailyPlanSchema,
					plan,
					`removeManyTaskFromPlans API response item ${index}`
				)
			),
			{ method: 'removeManyTaskFromPlans', service: 'DailyPlanService', taskId }
		);
	};

	/**
	 * Delete a daily plan with validation
	 *
	 * @param planId - Daily plan ID to delete
	 * @returns Promise<DeleteResponse> - Delete response
	 * @throws ValidationError if response data doesn't match schema
	 */
	deleteDailyPlan = async (planId: string): Promise<DeleteResponse> => {
		const response = await this.delete<DeleteResponse>(`/daily-plan/${planId}`);
		return response.data;
	};
}

export const dailyPlanService = new DailyPlanService(GAUZY_API_BASE_SERVER_URL.value);
