import { IUser } from '@/core/types/interfaces';
import { post, put } from '../axios';

export function savePersonalSettingsAPI(id: string, data: any) {
	return post<IUser>(`/user/${id}`, { ...data });
}

// update/delete profile avatar for user setting
export function updateUserAvatarAPI(id: string, body: Partial<IUser>) {
	return put<IUser>(`/user/${id}`, body);
}
