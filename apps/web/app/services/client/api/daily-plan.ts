import qs from 'qs';
import { get, post, put } from '../axios';
import { ICreateDailyPlan, IDailyPlan, IEmployee, ITeamTask, PaginationResponse } from '@app/interfaces';
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

export function addTaskToPlanAPI(data: { employeeId: IEmployee['id']; taskId: ITeamTask['id'] }, planId: string) {
	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();

	const obj = {
		'where[organizationId]': organizationId
	} as Record<string, string>;

	const query = qs.stringify(obj);

	return put<IDailyPlan>(`/daily-plan/add-task/${planId}?${query}`, data, { tenantId });
}

export function removeTaskFromPlanAPI(data: Partial<ICreateDailyPlan>, planId: IDailyPlan['id']) {
	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();

	const obj = {
		'where[organizationId]': organizationId
	} as Record<string, string>;

	const query = qs.stringify(obj);

	return put<IDailyPlan>(`/daily-plan/task/${planId}?${query}`, data, { tenantId });
}
