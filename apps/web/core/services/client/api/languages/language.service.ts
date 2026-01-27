import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import {
	validatePaginationResponse,
	languageItemListSchema,
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

		return this.executeWithPaginationValidation(
			() => this.get<PaginationResponse<TLanguageItemList>>(endpoint),
			(data) => validatePaginationResponse(languageItemListSchema, data, 'getLanguages API response'),
			{ method: 'getLanguages', service: 'LanguageService', is_system }
		);
	};
}

export const languageService = new LanguageService(GAUZY_API_BASE_SERVER_URL.value);
