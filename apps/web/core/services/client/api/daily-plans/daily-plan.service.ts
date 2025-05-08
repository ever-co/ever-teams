import {
	DeleteResponse,
	ICreateDailyPlan,
	ID,
	IDailyPlan,
	IDailyPlanTasksUpdate,
	IRemoveTaskFromManyPlans,
	IUpdateDailyPlan,
	PaginationResponse
} from '@/core/types/interfaces';
import { APIService } from '../../api.service';
import { getActiveTeamIdCookie, getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

class DailyPlanService extends APIService {
	getAllDayPlans = async (activeTeamId?: ID) => {
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
		return this.get<PaginationResponse<IDailyPlan>>(`/daily-plan?${query}`, { tenantId });
	};

	getMyDailyPlans = async (activeTeamId?: ID) => {
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
		return this.get<PaginationResponse<IDailyPlan>>(`/daily-plan/me?${query}`, { tenantId });
	};

	getDayPlansByEmployee = async (employeeId?: string, activeTeamId?: ID) => {
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
		return this.get<PaginationResponse<IDailyPlan>>(`/daily-plan/employee/${employeeId}?${query}`, { tenantId });
	};

	getPlansByTask = async (taskId?: string) => {
		const organizationId = getOrganizationIdCookie();
		const tenantId = getTenantIdCookie();
		const organizationTeamId = getActiveTeamIdCookie();

		const obj = {
			'where[organizationId]': organizationId,
			'where[tenantId]': tenantId,
			'where[organizationTeamId]': organizationTeamId
		} as Record<string, string>;

		const query = qs.stringify(obj);

		return this.get<PaginationResponse<IDailyPlan>>(`/daily-plan/task/${taskId}?${query}`, { tenantId });
	};

	createDailyPlan = async (data: ICreateDailyPlan, tenantId?: string) => {
		return this.post<IDailyPlan>('/daily-plan', data, {
			tenantId
		});
	};

	updateDailyPlan = async (data: IUpdateDailyPlan, planId: string) => {
		return this.put<IDailyPlan>(`/daily-plan/${planId}`, data, {});
	};

	addTaskToPlan = async (data: IDailyPlanTasksUpdate, planId: string) => {
		const organizationId = getOrganizationIdCookie();
		const tenantId = getTenantIdCookie();

		return this.post<IDailyPlan>(`/daily-plan/${planId}/task`, { ...data, organizationId }, { tenantId });
	};

	removeTaskFromPlan = async (data: IDailyPlanTasksUpdate, planId: string) => {
		const organizationId = getOrganizationIdCookie();
		const tenantId = getTenantIdCookie();

		return this.put<IDailyPlan>(`/daily-plan/${planId}/task`, { ...data, organizationId }, { tenantId });
	};

	removeManyTaskFromPlans = async ({ taskId, data }: { taskId: string; data: IRemoveTaskFromManyPlans }) => {
		const organizationId = getOrganizationIdCookie();
		return this.put<IDailyPlan[]>(`/daily-plan/${taskId}/remove`, { ...data, organizationId });
	};

	deleteDailyPlan = async (planId: string) => {
		return this.delete<DeleteResponse>(`/daily-plan/${planId}`);
	};
}

export const dailyPlanService = new DailyPlanService(GAUZY_API_BASE_SERVER_URL.value);
