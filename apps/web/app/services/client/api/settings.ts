import { IUser } from "@app/interfaces";
import api from "../axios";


export function savePersonalSettingsAPI(id: string, user: IUser) {
  return api.post<IUser>(
    `/user/${id}`,
    { ...user }
  );
}

// update profile avatar for user setting
export function updateUserAvatarAPI(userId: string, imageURL: IUser["imageUrl"]) {
	return api.put<IUser>(`/user/${userId}`, imageURL);
}
