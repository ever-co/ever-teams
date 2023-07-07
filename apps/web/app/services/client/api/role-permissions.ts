import { IRolePermissions, PaginationResponse } from '@app/interfaces/';
import api from '../axios';

export function getRolePermissionAPI(id: string) {
	return api.get<PaginationResponse<IRolePermissions>>(
		`/role-permissions/${id}`
	);
}

export function updateRolePermissionAPI(data: IRolePermissions) {
	return api.put<IRolePermissions>(`/role-permissions/${data.id}`, data);
}
