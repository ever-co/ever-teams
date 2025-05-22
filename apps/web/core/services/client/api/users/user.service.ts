import { DeleteResponse, IUser } from '@/core/types/interfaces/to-review';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import qs from 'qs';

class UserService extends APIService {
	deleteUser = async (id: string) => {
		return this.delete<DeleteResponse>(`/user/${id}`);
	};

	resetUser = async () => {
		return this.delete<DeleteResponse>(`/user/reset`);
	};

	/**
	 * Fetches data of the authenticated user with specified relations and the option to include employee details.
	 *
	 * @returns A Promise resolving to the IUser object.
	 */
	getAuthenticatedUserData = async () => {
		// Define the relations to be included in the request
		const relations = ['role', 'tenant'];

		// Construct the query string with 'qs', including the includeEmployee parameter
		const query = qs.stringify({
			relations: relations,
			includeEmployee: true // Append includeEmployee parameter set to true
		});

		// Execute the GET request to fetch the user data
		return this.get<IUser>(`/user/me?${query}`);
	};

	savePersonalSettings = async (id: string, data: any) => {
		return this.post<IUser>(`/user/${id}`, { ...data });
	};

	// update/delete profile avatar for user setting
	updateUserAvatar = async (id: string, body: Partial<IUser>) => {
		return this.put<IUser>(`/user/${id}`, body);
	};
}

export const userService = new UserService(GAUZY_API_BASE_SERVER_URL.value);
