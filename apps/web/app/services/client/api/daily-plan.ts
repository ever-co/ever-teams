import qs from 'qs';
import { deleteApi, get, post, put } from '../axios';
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
import { getActiveTeamIdCookie, getOrganizationIdCookie, getTenantIdCookie } from '@app/helpers';

export function getAllDayPlansAPI(activeTeamId?: ID) {
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
	return get<PaginationResponse<IDailyPlan>>(`/daily-plan?${query}`, { tenantId });
}

export function getMyDailyPlansAPI(activeTeamId?: ID) {
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
	return get<PaginationResponse<IDailyPlan>>(`/daily-plan/me?${query}`, { tenantId });
}

export function getDayPlansByEmployeeAPI(employeeId?: string, activeTeamId?: ID) {
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
	return get<PaginationResponse<IDailyPlan>>(`/daily-plan/employee/${employeeId}?${query}`, { tenantId });
}

export function getPlansByTaskAPI(taskId?: string) {
	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();
	const organizationTeamId = getActiveTeamIdCookie();

	const obj = {
		'where[organizationId]': organizationId,
		'where[tenantId]': tenantId,
		'where[organizationTeamId]': organizationTeamId
	} as Record<string, string>;

	const query = qs.stringify(obj);

	return get<PaginationResponse<IDailyPlan>>(`/daily-plan/task/${taskId}?${query}`, { tenantId });
}

export function createDailyPlanAPI(data: ICreateDailyPlan, tenantId?: string) {
	return post<IDailyPlan>('/daily-plan', data, {
		tenantId
	});
}

export function updateDailyPlanAPI(data: IUpdateDailyPlan, planId: string) {
	return put<IDailyPlan>(`/daily-plan/${planId}`, data, {});
}

export function addTaskToPlanAPI(data: IDailyPlanTasksUpdate, planId: string) {
	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();

	return post<IDailyPlan>(`/daily-plan/${planId}/task`, { ...data, organizationId }, { tenantId });
}

export function removeTaskFromPlanAPI(data: IDailyPlanTasksUpdate, planId: string) {
	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();

	return put<IDailyPlan>(`/daily-plan/${planId}/task`, { ...data, organizationId }, { tenantId });
}

export function removeManyTaskFromPlansAPI({ taskId, data }: { taskId: string; data: IRemoveTaskFromManyPlans }) {
	const organizationId = getOrganizationIdCookie();
	return put<IDailyPlan[]>(`/daily-plan/${taskId}/remove`, { ...data, organizationId });
}

export function deleteDailyPlanAPI(planId: string) {
	return deleteApi<DeleteResponse>(`/daily-plan/${planId}`);
}
