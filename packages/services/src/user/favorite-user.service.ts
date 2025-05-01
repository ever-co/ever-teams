import { EVER_TEAMS_API_BASE_URL } from '@ever-teams/constants';
import { APIService } from '../api.service';

/**
 * Service class for managing user favorites in Ever Teams.
 *
 * Allows creating, updating, deleting, and retrieving user favorites within a workspace.
 *
 * @class
 * @extends {APIService}
 */
export class FavoriteService extends APIService {
	/**
	 * Initializes the FavoriteService with a specified or default API base URL.
	 *
	 * @param {string} [baseURL] - Optional override for the default API base URL.
	 */
	constructor(baseURL: string = EVER_TEAMS_API_BASE_URL) {
		super(baseURL);
	}

	/**
	 * Adds a new favorite item.
	 *
	 * @param {CreateFavoriteDTO} data - Favorite item creation data.
	 * @returns {Promise<IFavorite>}
	 */
	async createFavorite(data: any) {
		try {
			const response = await this.post<any>('/api/favorites/', data);
			return response.data;
		} catch (error: any) {
			throw error?.response?.data || error;
		}
	}

	/**
	 * Updates an existing favorite item.
	 *
	 * @param {string} favoriteId - The ID of the favorite item to update.
	 * @param {UpdateFavoriteDTO} data - Partial update data.
	 * @returns {Promise<IFavorite>}
	 */
	async updateFavorite(favoriteId: string, data: any) {
		try {
			const response = await this.patch<any>(`/api/favorites/${favoriteId}/`, data);
			return response.data;
		} catch (error: any) {
			throw error?.response?.data || error;
		}
	}

	/**
	 * Removes a favorite item.
	 *
	 * @param {string} favoriteId - The ID of the favorite item to remove.
	 * @returns {Promise<void>}
	 */
	async deleteFavorite(favoriteId: string): Promise<void> {
		try {
			await this.delete<void>(`/api/favorites/${favoriteId}/`);
		} catch (error: any) {
			throw error?.response?.data || error;
		}
	}

	/**
	 * Fetches the list of all user's favorites within the workspace.
	 *
	 * @returns {Promise<any[]>}
	 */
	async fetchFavorites() {
		try {
			const response = await this.get<any>('/api/favorites/');
			return response.data;
		} catch (error: any) {
			throw error?.response?.data || error;
		}
	}
}
