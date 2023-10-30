import { DeleteResponse } from '@app/interfaces';
import api from '../axios';

export function deleteUserAPI(id: string) {
	return api.delete<DeleteResponse>(`/user/${id}`);
}

export function resetUserAPI() {
	return api.delete<DeleteResponse>(`/user/reset`);
}
