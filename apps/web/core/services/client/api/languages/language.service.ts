import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import {
	validatePaginationResponse,
	languageItemListSchema,
	ZodValidationError,
	TLanguageItemList
} from '@/core/types/schemas';

/**
 * Enhanced Language Service with Zod validation
 *
 * This service extends the base APIService to add schema validation
 * for all API responses, ensuring data integrity and type safety.
 */
class LanguageService extends APIService {
	/**
	 * Get all languages with validation
	 *
	 * @param is_system - Whether to fetch system languages
	 * @returns Promise<PaginationResponse<TLanguageItemList>> - Validated languages data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getLanguages = async (is_system: boolean): Promise<PaginationResponse<TLanguageItemList>> => {
		const endpoint = `/languages?is_system=${is_system}`;
		const response = await this.get<PaginationResponse<TLanguageItemList>>(endpoint);

		try {
			// Validate the response data using Zod schema
			return validatePaginationResponse(languageItemListSchema, response.data, 'getLanguages API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				console.error('Language validation failed:', error.message);
				console.error('Validation issues:', error.issues);
				// Log the actual data structure for debugging
				console.log('Actual API response data:', JSON.stringify(response.data, null, 2));
			}
			throw error;
		}
	};
}

export const languageService = new LanguageService(GAUZY_API_BASE_SERVER_URL.value);
