import { IRole, PaginationResponse } from '@app/interfaces';
import { deleteApi, get, post, put } from '../axios';

export function getRolesAPI() {
	return get<PaginationResponse<IRole>>('/roles');
}

export function createRoleAPI(data: IRole) {
	return post<IRole>('/roles', data);
}

export function deleteRoleAPI(id: string) {
	return deleteApi<IRole>(`/roles/${id}`);
}

export function updateRoleAPI(data: IRole) {
	return put<IRole>(`/roles/${data.id}`, data);
}
