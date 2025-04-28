// api service
import { EVER_TEAMS_API_BASE_URL } from '@ever-teams/constants';
import { APIService } from '../api.service';

/**
 * Service class for managing user-related API operations in Ever Teams.
 *
 * @class
 * @extends {APIService}
 */
export class UserService extends APIService {
	/**
	 * Initializes the UserService with a specified or default API base URL.
	 *
	 * @param {string} [baseURL] - Optional override for the default API base URL.
	 */
	constructor(baseURL: string = EVER_TEAMS_API_BASE_URL) {
		super(baseURL);
	}

	/**
	 * Fetches the authenticated user's main account information.
	 *
	 * @returns {Promise<IUser>}
	 */
	async fetchAuthenticatedUser() {
		try {
			const response = await this.get('/api/me/', { validateStatus: null });
			return response.data;
		} catch (error: any) {
			throw error?.response?.data || error;
		}
	}

	/**
	 * Updates fields on the authenticated user's main account.
	 *
	 * @param {Partial<IUser>} data - Partial data to update the user.
	 * @returns {Promise<IUser>}
	 */
	async updateAuthenticatedUser(data: any) {
		try {
			const response = await this.patch('/api/users/me/', data);
			return response.data;
		} catch (error: any) {
			throw error?.response?.data || error;
		}
	}

	/**
	 * Fetches the authenticated user's detailed profile information.
	 *
	 * @returns {Promise<TUserProfile>}
	 */
	async fetchAuthenticatedUserProfile() {
		try {
			const response = await this.get('/api/users/me/profile/');
			return response.data;
		} catch (error: any) {
			throw error?.response?.data || error;
		}
	}

	/**
	 * Updates fields on the authenticated user's profile.
	 *
	 * @param {Partial<TUserProfile>} data - Partial profile data to update.
	 * @returns {Promise<TUserProfile>}
	 */
	async updateAuthenticatedUserProfile(data: any) {
		try {
			const response = await this.patch('/api/users/me/profile/', data);
			return response.data;
		} catch (error: any) {
			throw error?.response?.data || error;
		}
	}
}
