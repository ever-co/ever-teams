import api from '../axios';

export function editOrganizationProjectSettingAPI(id: string, data: any, tenantId?: string) {
	return api.put<any>(`/organization-projects/setting/${id}`, data, {
		headers: {
			'Tenant-Id': tenantId
		}
	});
}
