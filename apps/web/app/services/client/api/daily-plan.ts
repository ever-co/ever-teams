import qs from 'qs';
import { deleteApi, get, post, put } from '../axios';
import {
	DeleteResponse,
	ICreateDailyPlan,
	IDailyPlan,
	IDailyPlanTasksUpdate,
	PaginationResponse
} from '@app/interfaces';
import { getOrganizationIdCookie, getTenantIdCookie } from '@app/helpers';

export function getAllDayPlansAPI() {
	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();

	const relations = ['employee', 'tasks'];

	const obj = {
		'where[organizationId]': organizationId,
		'where[tenantId]': tenantId
	} as Record<string, string>;

	relations.forEach((relation, i) => {
		obj[`relations[${i}]`] = relation;
	});

	const query = qs.stringify(obj);
	return get<PaginationResponse<IDailyPlan>>(`/daily-plan?${query}`, { tenantId });
}

export function getDayPlansByEmployeeAPI(employeeId?: string) {
	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();

	const relations = ['employee', 'tasks'];

	const obj = {
		'where[organizationId]': organizationId,
		'where[tenantId]': tenantId
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

	const obj = {
		'where[organizationId]': organizationId,
		'where[tenantId]': tenantId
	} as Record<string, string>;

	const query = qs.stringify(obj);

	return get<PaginationResponse<IDailyPlan>>(`/daily-plan/task/${taskId}?${query}`, { tenantId });
}

export function createDailyPlanAPI(data: ICreateDailyPlan, tenantId?: string) {
	return post<IDailyPlan>('/daily-plan', data, {
		tenantId
	});
}

export function updateDailyPlanAPI(data: Partial<ICreateDailyPlan>, planId: string) {
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

export function deleteDailyPlanAPI(planId: string) {
	return deleteApi<DeleteResponse>(`/daily-plan/${planId}`);
}
