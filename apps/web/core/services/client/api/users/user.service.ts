import { IUser } from '@/core/types/interfaces/user/user';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import qs from 'qs';
import {
	validateApiResponse,
	deleteResponseSchema,
	ZodValidationError,
	TDeleteResponse,
	TUser
} from '@/core/types/schemas';

class UserService extends APIService {
	deleteUser = async (id: string): Promise<TDeleteResponse> => {
		try {
			const response = await this.delete<TDeleteResponse>(`/user/${id}`);

			// Validate API response using utility function
			return validateApiResponse(deleteResponseSchema, response.data, 'deleteUser API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'User deletion validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'UserService'
				);
			}
			throw error;
		}
	};

	resetUser = async (): Promise<TDeleteResponse> => {
		try {
			const response = await this.delete<TDeleteResponse>(`/user/reset`);

			// Validate API response using utility function
			return validateApiResponse(deleteResponseSchema, response.data, 'resetUser API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'User reset validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'UserService'
				);
			}
			throw error;
		}
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
		return this.get<TUser>(`/user/me?${query}`);
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
