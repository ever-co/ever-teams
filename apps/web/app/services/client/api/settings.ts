import { IUser } from '@app/interfaces';
import api from '../axios';

export function savePersonalSettingsAPI(id: string, data: any) {
	return api.post<IUser>(`/user/${id}`, { ...data });
}

// update/delete profile avatar for user setting
export function updateUserAvatarAPI(id: string, body: Partial<IUser>) {
	return api.put<IUser>(`/user/${id}`, body);
}
