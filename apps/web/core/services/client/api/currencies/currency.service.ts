import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { APIService } from '../../api.service';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import {
	validatePaginationResponse,
	currencyListSchema,
	ZodValidationError,
	TCurrencyList
} from '@/core/types/schemas';
import { Logger } from '@/core/services/logs/logger.service';

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
		const organizationId = getOrganizationIdCookie();
		const tenantId = getTenantIdCookie();

		const obj = {
			'where[organizationId]': organizationId,
			'where[tenantId]': tenantId
		} as Record<string, string>;

		const query = qs.stringify(obj);
		const response = await this.get<PaginationResponse<TCurrencyList>>(`/currency?${query}`);

		try {
			// Validate the response data using Zod schema
			return validatePaginationResponse(currencyListSchema, response.data, 'getCurrencies API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				const loggerService = Logger.getInstance();
				loggerService.error(
					'Currency validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'CurrencyService'
				);
				loggerService.debug('Actual API response data:', response.data, 'CurrencyService');
			}
			throw error;
		}
	};
}

export const currencyService = new CurrencyService(GAUZY_API_BASE_SERVER_URL.value);
