import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { APIService } from '../../api.service';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { IFavoriteCreateRequest } from '@/core/types/interfaces/common/favorite';
import { DeleteResponse, PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { ID } from '@/core/types/interfaces/common/base-interfaces';
import {
	validatePaginationResponse,
	favoriteSchema,
	validateApiResponse,
	favoriteCreateSchema,
	ZodValidationError,
	TFavorite
} from '@/core/types/schemas';

/**
 * Enhanced Favorite Service with Zod validation
 *
 * This service extends the base APIService to add schema validation
 * for all API responses, ensuring data integrity and type safety.
 */
class FavoriteService extends APIService {
	/**
	 * Create a new favorite with validation
	 *
	 * @param body - Favorite creation data
	 * @returns Promise<TFavorite> - Validated created favorite
	 * @throws ValidationError if response data doesn't match schema
	 */
	createFavorite = async (body: IFavoriteCreateRequest): Promise<TFavorite> => {
		try {
			const organizationId = getOrganizationIdCookie();
			const tenantId = getTenantIdCookie();

			const data = {
				...body,
				organizationId,
				tenantId
			};

			// Validate input data before sending
			const validatedInput = validateApiResponse(
				favoriteCreateSchema.partial(), // Allow partial data for creation
				data,
				'createFavorite input data'
			);

			const response = await this.post<TFavorite>('/favorite', validatedInput, { tenantId });

			// Validate the response data
			return validateApiResponse(favoriteSchema, response.data, 'createFavorite API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Favorite creation validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'FavoriteService'
				);
			}
			throw error;
		}
	};

	/**
	 * Get favorites by employee ID with validation
	 *
	 * @param employeeId - Employee ID to get favorites for
	 * @returns Promise<PaginationResponse<TFavorite>> - Validated favorites data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getFavoritesByEmployee = async (employeeId: ID): Promise<PaginationResponse<TFavorite>> => {
		try {
			const organizationId = getOrganizationIdCookie();
			const tenantId = getTenantIdCookie();

			const obj = {
				'where[employeeId]': employeeId,
				'where[organizationId]': organizationId,
				'where[tenantId]': tenantId
			} as Record<string, string>;

			const query = qs.stringify(obj);
			const endpoint = `/favorite/employee?${query}`;

			const response = await this.get<PaginationResponse<TFavorite>>(endpoint, { tenantId });

			// Validate the response data using Zod schema
			return validatePaginationResponse(favoriteSchema, response.data, 'getFavoritesByEmployee API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Favorite retrieval validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'FavoriteService'
				);
			}
			throw error;
		}
	};

	/**
	 * Delete a favorite with validation
	 *
	 * @param favoriteId - Favorite ID to delete
	 * @returns Promise<DeleteResponse> - Validated delete response
	 * @throws ValidationError if response data doesn't match schema
	 */
	deleteFavorite = async (favoriteId: ID): Promise<DeleteResponse> => {
		try {
			const endpoint = `/favorite/${favoriteId}`;

			const response = await this.delete<DeleteResponse>(endpoint);

			// For delete operations, we typically just return the response as-is
			// since DeleteResponse is a simple interface with success/message fields
			return response.data;
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Favorite deletion validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'FavoriteService'
				);
			}
			throw error;
		}
	};
}

export const favoriteService = new FavoriteService(GAUZY_API_BASE_SERVER_URL.value);
