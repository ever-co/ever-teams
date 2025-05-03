import { IUser } from '@/core/types/interfaces';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

class UserSettingService extends APIService {
	savePersonalSettingsAPI = async (id: string, data: any) => {
		return this.post<IUser>(`/user/${id}`, { ...data });
	};

	// update/delete profile avatar for user setting
	updateUserAvatar = async (id: string, body: Partial<IUser>) => {
		return this.put<IUser>(`/user/${id}`, body);
	};
}

export const userSettingService = new UserSettingService(GAUZY_API_BASE_SERVER_URL.value);
