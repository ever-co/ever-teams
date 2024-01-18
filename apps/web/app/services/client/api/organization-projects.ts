import { IProject } from '@app/interfaces';
import { put } from '../axios';

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
