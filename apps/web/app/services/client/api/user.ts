import { DeleteReponse } from '@app/interfaces';
import api from '../axios';

export function deleteUserAPI(id: string) {
	return api.delete<DeleteReponse>(`/user/${id}`);
}

export function resetUserAPI() {
	return api.delete<DeleteReponse>(`/user/reset`);
}
