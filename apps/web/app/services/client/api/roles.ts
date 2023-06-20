import { IRole, PaginationResponse } from '@app/interfaces';
import api from '../axios';

export function getRolesAPI() {
	return api.get<PaginationResponse<IRole>>('/roles');
}

export function createRoleAPI(data: IRole) {
	return api.post<IRole>('/roles', data);
}

export function deleteRoleAPI(id: string) {
	return api.delete<IRole>(`/roles/${id}`);
}

export function updateRoleAPI(data: IRole) {
	return api.put<IRole>(`/roles/${data.id}`, data);
}
