import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { APIService } from '../../api.service';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { IFavorite, IFavoriteCreateRequest } from '@/core/types/interfaces/common/favorite';
import { DeleteResponse, PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { ID } from '@/core/types/interfaces/common/base-interfaces';

class FavoriteService extends APIService {
	/**
	 * Create a new favorite
	 */
	createFavorite = async (body: IFavoriteCreateRequest) => {
		const organizationId = getOrganizationIdCookie();
		const tenantId = getTenantIdCookie();

		const data = {
			...body,
			organizationId,
			tenantId
		};

		return this.post<IFavorite>('/favorite', data, { tenantId });
	};

	/**
	 * Get favorites by employee ID
	 */
	getFavoritesByEmployee = async (employeeId: ID) => {
		const organizationId = getOrganizationIdCookie();
		const tenantId = getTenantIdCookie();

		const obj = {
			'where[employeeId]': employeeId,
			'where[organizationId]': organizationId,
			'where[tenantId]': tenantId
		} as Record<string, string>;

		const query = qs.stringify(obj);
		const endpoint = `/favorite/employee?${query}`;

		return this.get<PaginationResponse<IFavorite>>(endpoint, { tenantId });
	};

	/**
	 * Delete a favorite
	 */
	deleteFavorite = async (favoriteId: ID, employeeId: ID) => {
		const organizationId = getOrganizationIdCookie();
		const tenantId = getTenantIdCookie();

		const obj = {
			'where[employeeId]': employeeId,
			'where[organizationId]': organizationId,
			'where[tenantId]': tenantId
		} as Record<string, string>;

		const query = qs.stringify(obj);
		const endpoint = `/favorite/${favoriteId}`;

		return this.delete<DeleteResponse>(endpoint, { tenantId });
	};
}

export const favoriteService = new FavoriteService(GAUZY_API_BASE_SERVER_URL.value);
