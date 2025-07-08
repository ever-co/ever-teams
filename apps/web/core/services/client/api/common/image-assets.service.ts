import { getAccessTokenCookie } from '@/core/lib/helpers/cookies';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { validateApiResponse, imageAssetSchema, ZodValidationError } from '@/core/types/schemas';
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
	 * @param tenantId - The tenant ID
	 * @param organizationId - The organization ID
	 * @returns Promise<TImageAsset> - Validated image asset data
	 * @throws ValidationError if response data doesn't match schema
	 */
	uploadImageAsset = async (
		file: File,
		folder: string,
		tenantId: string,
		organizationId: string
	): Promise<TImageAsset> => {
		const bearer_token = getAccessTokenCookie();
		const formData = new FormData();
		formData.append('file', file);
		formData.append('tenantId', tenantId);
		formData.append('organizationId', organizationId);

		const response = await this.post<TImageAsset>(`/image-assets/upload/${folder}`, formData, {
			headers: {
				'tenant-id': tenantId,
				Authorization: `Bearer ${bearer_token}`
			}
		});

		try {
			// Validate the response data using Zod schema
			return validateApiResponse(imageAssetSchema, response.data, 'uploadImageAsset API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Image asset validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'ImageAssetsService'
				);
				this.logger.debug('Actual API response data:', response.data, 'ImageAssetsService');
			}
			throw error;
		}
	};
}

export const imageAssetsService = new ImageAssetsService(GAUZY_API_BASE_SERVER_URL.value);
