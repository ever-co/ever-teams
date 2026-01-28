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
		const data = {
			...body,
			organizationId: this.organizationId,
			tenantId: this.tenantId
		};

		const validatedInput = validateApiResponse(
			favoriteCreateSchema.partial(),
			data,
			'createFavorite input data'
		);

		return this.executeWithValidation(
			() => this.post<TFavorite>('/favorite', validatedInput, { tenantId: this.tenantId }),
			(responseData) => validateApiResponse(favoriteSchema, responseData, 'createFavorite API response'),
			{ method: 'createFavorite', service: 'FavoriteService' }
		);
	};

	/**
	 * Get favorites by employee ID with validation
	 *
	 * @param employeeId - Employee ID to get favorites for
	 * @returns Promise<PaginationResponse<TFavorite>> - Validated favorites data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getFavoritesByEmployee = async ({ employeeId }: { employeeId: ID }): Promise<PaginationResponse<TFavorite>> => {
		const obj = {
			'where[employeeId]': employeeId,
			'where[organizationId]': this.organizationId,
			'where[tenantId]': this.tenantId
		} as Record<string, string>;

		const query = qs.stringify(obj);
		const endpoint = `/favorite/employee?${query}`;

		return this.executeWithPaginationValidation(
			() => this.get<PaginationResponse<TFavorite>>(endpoint, { tenantId: this.tenantId }),
			(data) => validatePaginationResponse(favoriteSchema, data, 'getFavoritesByEmployee API response'),
			{ method: 'getFavoritesByEmployee', service: 'FavoriteService', employeeId }
		);
	};

	/**
	 * Delete a favorite with validation
	 *
	 * @param favoriteId - Favorite ID to delete
	 * @returns Promise<DeleteResponse> - Validated delete response
	 * @throws ValidationError if response data doesn't match schema
	 */
	deleteFavorite = async (favoriteId: string): Promise<DeleteResponse> => {
		const response = await this.delete<DeleteResponse>(`/favorite/${favoriteId}`);
		return response.data;
	};
}

export const favoriteService = new FavoriteService(GAUZY_API_BASE_SERVER_URL.value);
