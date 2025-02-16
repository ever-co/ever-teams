import { IProject, PaginationResponse } from '@app/interfaces';
import { get, put } from '../axios';
import qs from 'qs';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/app/helpers';

export function editOrganizationProjectSettingAPI(id: string, data: any, tenantId?: string) {
	return put<any>(`/organization-projects/setting/${id}`, data, {
		tenantId
	});
}

export function editOrganizationProjectAPI(id: string, data: any, tenantId?: string) {
	return put<IProject>(`/organization-projects/${id}`, data, {
		tenantId
	});
}

export function getOrganizationProjectAPI(id: string, tenantId?: string) {
	return get<IProject>(`/organization-projects/${id}`, {
		tenantId
	});
}

export function getOrganizationProjectsAPI({ queries }: { queries?: Record<string, string> } = {}) {
	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();

	const obj = {
		'where[organizationId]': organizationId,
		'where[tenantId]': tenantId,
		'join[alias]': 'organization_project',
		'join[leftJoin][tags]': 'organization_project.tags'
	} as Record<string, string>;

	const relations = ['members', 'teams', 'members.employee', 'members.employee.user'];

	relations.forEach((relation, i) => {
		obj[`relations[${i}]`] = relation;
	});

	if (queries) {
		Object.entries(queries).forEach(([key, value]) => {
			obj[key] = value;
		});
	}

	const query = qs.stringify(obj);

	return get<PaginationResponse<IProject>>(`/organization-projects?${query}`, {
		tenantId
	});
}
