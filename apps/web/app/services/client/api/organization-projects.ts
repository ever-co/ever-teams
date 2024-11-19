import {  IProject, PaginationResponse } from '@app/interfaces';
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

export function getOrganizationProjectsAPI() {

	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();

	const obj = {
		'where[organizationId]': organizationId,
		'where[tenantId]': tenantId,
	}
	const query = qs.stringify(obj);

	return get<PaginationResponse<IProject>>(`/organization-projects?${query}`, {
		tenantId
	});
}
