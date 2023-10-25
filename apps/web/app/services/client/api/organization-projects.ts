import { IProject } from '@app/interfaces';
import api from '../axios';

export function editOrganizationProjectSettingAPI(id: string, data: any, tenantId?: string) {
	return api.put<any>(`/organization-projects/setting/${id}`, data, {
		headers: {
			'Tenant-Id': tenantId
		}
	});
}

export function editOrganizationProjectAPI(id: string, data: any, tenantId?: string) {
	return api.put<IProject>(`/organization-projects/${id}`, data, {
		headers: {
			'Tenant-Id': tenantId
		}
	});
}
