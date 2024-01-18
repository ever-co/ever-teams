import { IProject } from '@app/interfaces';
import api, { put } from '../axios';

export function editOrganizationProjectSettingAPI(id: string, data: any, tenantId?: string) {
	return put<any>(`/organization-projects/setting/${id}`, data, {
		tenantId
	});
}

export function editOrganizationProjectAPI(id: string, data: any, tenantId?: string) {
	return api.put<IProject>(`/organization-projects/${id}`, data, {
		headers: {
			'Tenant-Id': tenantId
		}
	});
}
