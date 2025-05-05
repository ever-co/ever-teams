import { DeleteResponse } from '@/core/types/interfaces';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

class UserService extends APIService {
	deleteUser = async (id: string) => {
		return this.delete<DeleteResponse>(`/user/${id}`);
	};

	resetUser = async () => {
		return this.delete<DeleteResponse>(`/user/reset`);
	};
}

export const userService = new UserService(GAUZY_API_BASE_SERVER_URL.value);
