import { EVER_TEAMS_API_BASE_URL } from '@ever-teams/constants';
import { APIService } from '../api.service';
import { FileUploadService } from './file-upload.service';
import { generateFileUploadPayload, getAssetIdFromUrl, getFileMetaDataForUpload } from './utils';

/**
 * Service class for managing file asset operations within Ever Teams.
 *
 * Handles asset uploads, restoration, and status updates.
 *
 * @class
 */
export class AssetService extends APIService {
	private readonly fileUploadService: FileUploadService;

	/**
	 * Initializes the AssetService with an optional base URL.
	 *
	 * @param {string} [baseURL] - Optional override for the default API base URL.
	 */
	constructor(baseURL: string = EVER_TEAMS_API_BASE_URL) {
		super(baseURL);
		this.fileUploadService = new FileUploadService();
	}

	/**
	 * Uploads a new asset to the given anchor.
	 *
	 * @param {string} anchor - The anchor identifier.
	 * @param {TFileEntityInfo} entityInfo - Metadata describing the file's association.
	 * @param {File} file - The file to upload.
	 * @returns {Promise<TFileSignedURLResponse>}
	 */
	async uploadAsset(anchor: string, entityInfo: any, file: File): Promise<any> {
		try {
			const fileMetaData = getFileMetaDataForUpload(file);
			const response = await this.post<any>(`/api/public/assets/v2/anchor/${anchor}/`, {
				...entityInfo,
				...fileMetaData,
			});

			const signedUrlResponse = response.data;
			const uploadPayload = generateFileUploadPayload(signedUrlResponse, file);

			await this.fileUploadService.uploadFileToSignedUrl(signedUrlResponse.upload_data.url, uploadPayload);
			await this.updateAssetUploadStatus(anchor, signedUrlResponse.asset_id);

			return signedUrlResponse;
		} catch (error: any) {
			throw error?.response?.data || error;
		}
	}

	/**
	 * Updates the upload status of a specific asset.
	 *
	 * @param {string} anchor - The anchor identifier.
	 * @param {string} assetId - The asset identifier.
	 * @returns {Promise<void>}
	 */
	async updateAssetUploadStatus(anchor: string, assetId: string): Promise<void> {
		try {
			await this.patch(`/api/public/assets/v2/anchor/${anchor}/${assetId}/`);
		} catch (error: any) {
			throw error?.response?.data || error;
		}
	}

	/**
	 * Updates the upload status for multiple assets in bulk.
	 *
	 * @param {string} anchor - The anchor identifier.
	 * @param {string} entityId - The entity identifier.
	 * @param {{ asset_ids: string[] }} payload - Asset IDs to update.
	 * @returns {Promise<void>}
	 */
	async updateBulkAssetsUploadStatus(
		anchor: string,
		entityId: string,
		payload: { asset_ids: string[] }
	): Promise<void> {
		try {
			await this.post(`/api/public/assets/v2/anchor/${anchor}/${entityId}/bulk/`, payload);
		} catch (error: any) {
			throw error?.response?.data || error;
		}
	}

	/**
	 * Restores a previously deleted asset.
	 *
	 * @param {string} workspaceSlug - The workspace identifier.
	 * @param {string} assetUrl - The URL of the asset to restore.
	 * @returns {Promise<void>}
	 */
	async restoreAsset(workspaceSlug: string, assetUrl: string): Promise<void> {
		try {
			const assetId = getAssetIdFromUrl(assetUrl);
			await this.post(`/api/public/assets/v2/workspaces/${workspaceSlug}/restore/${assetId}/`);
		} catch (error: any) {
			throw error?.response?.data || error;
		}
	}

	/**
	 * Cancels an ongoing file upload if it is in progress.
	 */
	cancelUpload(): void {
		this.fileUploadService.cancelUpload();
	}
}
