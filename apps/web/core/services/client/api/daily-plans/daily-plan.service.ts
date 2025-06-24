import { APIService } from '../../api.service';
import { getActiveTeamIdCookie, getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { ID } from '@/core/types/interfaces/common/base-interfaces';
import { DeleteResponse, PaginationResponse } from '@/core/types/interfaces/common/data-response';

import {
	validatePaginationResponse,
	dailyPlanSchema,
	validateApiResponse,
	createDailyPlanSchema,
	updateDailyPlanSchema,
	dailyPlanTasksUpdateSchema,
	ZodValidationError,
	TDailyPlan,
	TCreateDailyPlan,
	TUpdateDailyPlan,
	TDailyPlanTasksUpdate,
	TRemoveTaskFromPlansRequest
} from '@/core/types/schemas';

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
	 * @param activeTeamId - Optional team ID to filter plans
	 * @returns Promise<PaginationResponse<TDailyPlan>> - Validated daily plans data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getAllDayPlans = async (activeTeamId?: ID): Promise<PaginationResponse<TDailyPlan>> => {
		try {
			const organizationId = getOrganizationIdCookie();
			const tenantId = getTenantIdCookie();
			const organizationTeamId = getActiveTeamIdCookie();

			const relations = ['employee', 'tasks', 'employee.user', 'tasks.members', 'tasks.members.user'];

			const obj = {
				'where[organizationId]': organizationId,
				'where[tenantId]': tenantId,
				'where[organizationTeamId]': activeTeamId || organizationTeamId
			} as Record<string, string>;

			relations.forEach((relation, i) => {
				obj[`relations[${i}]`] = relation;
			});

			const query = qs.stringify(obj);
			const response = await this.get<PaginationResponse<TDailyPlan>>(`/daily-plan?${query}`, { tenantId });

			// Validate the response data using Zod schema
			return validatePaginationResponse(dailyPlanSchema, response.data, 'getAllDayPlans API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Daily plan validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'DailyPlanService'
				);
			}
			throw error;
		}
	};

	/**
	 * Get my daily plans with validation
	 *
	 * @param activeTeamId - Optional team ID to filter plans
	 * @returns Promise<PaginationResponse<TDailyPlan>> - Validated daily plans data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getMyDailyPlans = async (activeTeamId?: ID): Promise<PaginationResponse<TDailyPlan>> => {
		try {
			const organizationId = getOrganizationIdCookie();
			const tenantId = getTenantIdCookie();
			const organizationTeamId = getActiveTeamIdCookie();

			const relations = ['employee', 'tasks', 'employee.user', 'tasks.members', 'tasks.members.user'];

			const obj = {
				'where[organizationId]': organizationId,
				'where[tenantId]': tenantId,
				'where[organizationTeamId]': activeTeamId || organizationTeamId
			} as Record<string, string>;

			relations.forEach((relation, i) => {
				obj[`relations[${i}]`] = relation;
			});

			const query = qs.stringify(obj);
			const response = await this.get<PaginationResponse<TDailyPlan>>(`/daily-plan/me?${query}`, { tenantId });

			// Validate the response data using Zod schema
			return validatePaginationResponse(dailyPlanSchema, response.data, 'getMyDailyPlans API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'My daily plans validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'DailyPlanService'
				);
			}
			throw error;
		}
	};

	/**
	 * Get daily plans by employee with validation
	 *
	 * @param employeeId - Employee ID to get plans for
	 * @param activeTeamId - Optional team ID to filter plans
	 * @returns Promise<PaginationResponse<TDailyPlan>> - Validated daily plans data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getDayPlansByEmployee = async (employeeId?: string, activeTeamId?: ID): Promise<PaginationResponse<TDailyPlan>> => {
		try {
			const organizationId = getOrganizationIdCookie();
			const tenantId = getTenantIdCookie();
			const organizationTeamId = getActiveTeamIdCookie();

			const relations = ['employee', 'tasks', 'employee.user', 'tasks.members', 'tasks.members.user'];

			const obj = {
				'where[organizationId]': organizationId,
				'where[tenantId]': tenantId,
				'where[organizationTeamId]': activeTeamId || organizationTeamId
			} as Record<string, string>;

			relations.forEach((relation, i) => {
				obj[`relations[${i}]`] = relation;
			});

			const query = qs.stringify(obj);
			const response = await this.get<PaginationResponse<TDailyPlan>>(
				`/daily-plan/employee/${employeeId}?${query}`,
				{ tenantId }
			);

			// Validate the response data using Zod schema
			return validatePaginationResponse(dailyPlanSchema, response.data, 'getDayPlansByEmployee API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Daily plans by employee validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'DailyPlanService'
				);
			}
			throw error;
		}
	};

	/**
	 * Get daily plans by task with validation
	 *
	 * @param taskId - Task ID to get plans for
	 * @returns Promise<PaginationResponse<TDailyPlan>> - Validated daily plans data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getPlansByTask = async (taskId?: string): Promise<PaginationResponse<TDailyPlan>> => {
		try {
			const organizationId = getOrganizationIdCookie();
			const tenantId = getTenantIdCookie();
			const organizationTeamId = getActiveTeamIdCookie();

			const obj = {
				'where[organizationId]': organizationId,
				'where[tenantId]': tenantId,
				'where[organizationTeamId]': organizationTeamId
			} as Record<string, string>;

			const query = qs.stringify(obj);
			const response = await this.get<PaginationResponse<TDailyPlan>>(`/daily-plan/task/${taskId}?${query}`, {
				tenantId
			});

			// Validate the response data using Zod schema
			return validatePaginationResponse(dailyPlanSchema, response.data, 'getPlansByTask API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Daily plans by task validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'DailyPlanService'
				);
			}
			throw error;
		}
	};

	/**
	 * Create a new daily plan with validation
	 *
	 * @param data - Daily plan data without ID
	 * @param tenantId - Optional tenant ID
	 * @returns Promise<TDailyPlan> - Validated created daily plan
	 * @throws ValidationError if response data doesn't match schema
	 */
	createDailyPlan = async (data: TCreateDailyPlan, tenantId?: string): Promise<TDailyPlan> => {
		try {
			// Validate input data before sending
			const validatedInput = validateApiResponse(
				createDailyPlanSchema.partial(), // Allow partial data for creation
				data,
				'createDailyPlan input data'
			);

			const response = await this.post<TDailyPlan>('/daily-plan', validatedInput as Record<string, any>, {
				tenantId
			});

			// Validate the response data
			return validateApiResponse(dailyPlanSchema, response.data, 'createDailyPlan API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Daily plan creation validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'DailyPlanService'
				);
			}
			throw error;
		}
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
		try {
			// Validate input data before sending
			const validatedInput = validateApiResponse(updateDailyPlanSchema, data, 'updateDailyPlan input data');

			const response = await this.put<TDailyPlan>(
				`/daily-plan/${planId}`,
				validatedInput as Record<string, any>,
				{}
			);

			// Validate the response data
			return validateApiResponse(dailyPlanSchema, response.data, 'updateDailyPlan API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Daily plan update validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'DailyPlanService'
				);
			}
			throw error;
		}
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
		try {
			const organizationId = getOrganizationIdCookie();
			const tenantId = getTenantIdCookie();

			// Validate input data before sending
			const validatedInput = validateApiResponse(
				dailyPlanTasksUpdateSchema,
				{ ...data, organizationId },
				'addTaskToPlan input data'
			);

			const response = await this.post<TDailyPlan>(
				`/daily-plan/${planId}/task`,
				validatedInput as Record<string, any>,
				{ tenantId }
			);

			// Validate the response data
			return validateApiResponse(dailyPlanSchema, response.data, 'addTaskToPlan API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Add task to plan validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'DailyPlanService'
				);
			}
			throw error;
		}
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
		try {
			const organizationId = getOrganizationIdCookie();
			const tenantId = getTenantIdCookie();

			// Validate input data before sending
			const validatedInput = validateApiResponse(
				dailyPlanTasksUpdateSchema,
				{ ...data, organizationId },
				'removeTaskFromPlan input data'
			);

			const response = await this.put<TDailyPlan>(
				`/daily-plan/${planId}/task`,
				validatedInput as Record<string, any>,
				{ tenantId }
			);

			// Validate the response data
			return validateApiResponse(dailyPlanSchema, response.data, 'removeTaskFromPlan API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Remove task from plan validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'DailyPlanService'
				);
			}
			throw error;
		}
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
		try {
			const organizationId = getOrganizationIdCookie();

			// Validate input data before sending
			const validatedInput = validateApiResponse(
				dailyPlanTasksUpdateSchema,
				{ ...data, organizationId },
				'removeManyTaskFromPlans input data'
			);

			const response = await this.put<TDailyPlan[]>(
				`/daily-plan/${taskId}/remove`,
				validatedInput as Record<string, any>
			);

			// Validate the response data (array of daily plans)
			const validatedPlans = response.data.map((plan, index) =>
				validateApiResponse(dailyPlanSchema, plan, `removeManyTaskFromPlans API response item ${index}`)
			);

			return validatedPlans;
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Remove many tasks from plans validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'DailyPlanService'
				);
			}
			throw error;
		}
	};

	/**
	 * Delete a daily plan with validation
	 *
	 * @param planId - Daily plan ID to delete
	 * @returns Promise<DeleteResponse> - Delete response
	 * @throws ValidationError if response data doesn't match schema
	 */
	deleteDailyPlan = async (planId: string): Promise<DeleteResponse> => {
		try {
			const response = await this.delete<DeleteResponse>(`/daily-plan/${planId}`);

			// For delete operations, we typically just return the response as-is
			// since DeleteResponse is a simple interface
			return response.data;
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Daily plan deletion validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'DailyPlanService'
				);
			}
			throw error;
		}
	};
}

export const dailyPlanService = new DailyPlanService(GAUZY_API_BASE_SERVER_URL.value);
