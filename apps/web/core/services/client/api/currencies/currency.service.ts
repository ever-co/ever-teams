import { APIService } from '../../api.service';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import {
	validatePaginationResponse,
	currencyListSchema,
	TCurrencyList
} from '@/core/types/schemas';

/**
 * Enhanced Currency Service with Zod validation
 *
 * This service extends the base APIService to add schema validation
 * for all API responses, ensuring data integrity and type safety.
 */
class CurrencyService extends APIService {
	/**
	 * Get all currencies with validation
	 *
	 * @returns Promise<PaginationResponse<TCurrencyList>> - Validated currencies data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getCurrencies = async (): Promise<PaginationResponse<TCurrencyList>> => {
		const obj = {
			'where[organizationId]': this.organizationId,
			'where[tenantId]': this.tenantId
		} as Record<string, string>;

		const query = qs.stringify(obj);

		return this.executeWithPaginationValidation(
			() => this.get<PaginationResponse<TCurrencyList>>(`/currency?${query}`),
			(data) => validatePaginationResponse(currencyListSchema, data, 'getCurrencies API response'),
			{ method: 'getCurrencies', service: 'CurrencyService' }
		);
	};
}

export const currencyService = new CurrencyService(GAUZY_API_BASE_SERVER_URL.value);
