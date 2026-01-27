import { getAccessTokenCookie } from '@/core/lib/helpers/cookies';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { validateApiResponse, imageAssetSchema } from '@/core/types/schemas';
import { TImageAsset } from '@/core/types/schemas/common/image-asset.schema';

/**
 * Enhanced Image Assets Service with Zod validation
 *
 * This service extends the base APIService to add schema validation
 * for all API responses, ensuring data integrity and type safety.
 */
class ImageAssetsService extends APIService {
	/**
	 * Upload an image asset with validation
	 *
	 * @param file - The file to upload
	 * @param folder - The folder to upload to
	 * @returns Promise<TImageAsset> - Validated image asset data
	 * @throws ValidationError if response data doesn't match schema
	 */
	uploadImageAsset = async ({ file, folder }: { file: File; folder: string }): Promise<TImageAsset> => {
		const bearer_token = getAccessTokenCookie();
		const formData = new FormData();
		formData.append('file', file);
		formData.append('tenantId', this.tenantId);
		formData.append('organizationId', this.organizationId);

		return this.executeWithValidation(
			() => this.post<TImageAsset>(`/image-assets/upload/${folder}`, formData, {
				headers: {
					'tenant-id': this.tenantId,
					Authorization: `Bearer ${bearer_token}`
				}
			}),
			(data) => validateApiResponse(imageAssetSchema, data, 'uploadImageAsset API response'),
			{ method: 'uploadImageAsset', service: 'ImageAssetsService', folder }
		);
	};
}

export const imageAssetsService = new ImageAssetsService(GAUZY_API_BASE_SERVER_URL.value);
