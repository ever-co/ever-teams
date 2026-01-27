import { TUser } from '@/core/types/schemas';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import qs from 'qs';
import {
	validateApiResponse,
	deleteResponseSchema,
	userSchema,
	TDeleteResponse
} from '@/core/types/schemas';

class UserService extends APIService {
	deleteUser = async (userId: string): Promise<TDeleteResponse> => {
		return this.executeWithValidation(
			() => this.delete<TDeleteResponse>(`/user/${userId}`),
			(data) => validateApiResponse(deleteResponseSchema, data, 'deleteUser API response'),
			{ method: 'deleteUser', service: 'UserService', userId }
		);
	};

	resetUser = async (): Promise<TDeleteResponse> => {
		return this.executeWithValidation(
			() => this.delete<TDeleteResponse>(`/user/reset`),
			(data) => validateApiResponse(deleteResponseSchema, data, 'resetUser API response'),
			{ method: 'resetUser', service: 'UserService' }
		);
	};

	/**
	 * Fetches data of the authenticated user with specified relations and the option to include employee details.
	 *
	 * @returns A Promise resolving to the validated TUser object.
	 */
	getAuthenticatedUserData = async (): Promise<TUser> => {
		// Define the relations to be included in the request
		const relations = ['role', 'tenant'];

		// Construct the query string with 'qs', including the includeEmployee parameter
		const query = qs.stringify({
			relations: relations,
			includeEmployee: true // Append includeEmployee parameter set to true
		});

		return this.executeWithValidation(
			() => this.get<TUser>(`/user/me?${query}`),
			(data) => validateApiResponse(userSchema, data, 'getAuthenticatedUserData API response'),
			{ method: 'getAuthenticatedUserData', service: 'UserService' }
		);
	};

	savePersonalSettings = async ({ userId, data }: { userId: string; data: any }) => {
		return this.post<TUser>(`/user/${userId}`, { ...data });
	};

	// update/delete profile avatar for user setting
	updateUserAvatar = async ({ userId, body }: { userId: string; body: Partial<TUser> }): Promise<TUser> => {
		return this.executeWithValidation(
			() => this.put<TUser>(`/user/${userId}`, body),
			(data) => validateApiResponse(userSchema, data, 'updateUserAvatar API response'),
			{ method: 'updateUserAvatar', service: 'UserService', userId }
		);
	};
}

export const userService = new UserService(GAUZY_API_BASE_SERVER_URL.value);
