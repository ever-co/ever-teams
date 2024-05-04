import qs from 'qs';
import { get, post, put } from '../axios';
import { ICreateDailyPlan, IDailyPlan, PaginationResponse } from '@app/interfaces';
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

export function createDailyPlanAPI(data: ICreateDailyPlan, tenantId?: string) {
	return post<ICreateDailyPlan>('/daily-plan', data, {
		tenantId
	});
}

export function updateDailyPlanAPI(data: Partial<ICreateDailyPlan>, planId: string) {
	return put<IDailyPlan>(`/daily-plan/${planId}`, data, {});
}
