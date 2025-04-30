import { IRolePermissions, PaginationResponse } from '@/core/types/interfaces';
import { get, put } from '../axios';
import { getTenantIdCookie } from '@app/helpers';
import qs from 'qs';

export function getRolePermissionAPI(id: string) {
	const tenantId = getTenantIdCookie();

	const params = {
		data: JSON.stringify({
			findInput: {
				roleId: id,
				tenantId
			}
		})
	};
	const query = qs.stringify(params);

	return get<PaginationResponse<IRolePermissions>>(`/role-permissions/${id}?${query}`);
}

export function updateRolePermissionAPI(data: IRolePermissions) {
	return put<IRolePermissions>(`/role-permissions/${data.id}`, data);
}
