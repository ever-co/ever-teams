import { EVER_TEAMS_API_BASE_URL } from '@ever-teams/constants';
import { APIService } from '../api.service';

/**
 * Service class for managing file assets within Ever Teams.
 *
 * Handles deletion and future asset-related operations.
 *
 * @class
 * @extends {APIService}
 */
export class FileService extends APIService {
	/**
	 * Initializes the FileService with an optional base URL.
	 *
	 * @param {string} [baseURL] - Optional override for the default API base URL.
	 */
	constructor(baseURL: string = EVER_TEAMS_API_BASE_URL) {
		super(baseURL);
	}

	/**
	 * Deletes a file asset based on its path.
	 *
	 * @param {string} assetPath - The relative or full path of the asset to delete.
	 * @returns {Promise<{ success: boolean }>} Promise resolving to a deletion confirmation.
	 * @throws {any} If the delete request fails.
	 */
	async deleteAsset(assetPath: string): Promise<{ success: boolean }> {
		try {
			await this.delete(assetPath);
			return { success: true };
		} catch (error: any) {
			throw error?.response?.data || error;
		}
	}
}
