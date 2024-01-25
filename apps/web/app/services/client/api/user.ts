import { DeleteResponse } from '@app/interfaces';
import { deleteApi } from '../axios';

export function deleteUserAPI(id: string) {
	return deleteApi<DeleteResponse>(`/user/${id}`);
}

export function resetUserAPI() {
	return deleteApi<DeleteResponse>(`/user/reset`);
}
