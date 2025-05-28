import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { IUserOrganization } from '@/core/types/interfaces/organization/user-organization';

class UserOrganizationService extends APIService {
	/**
	 * Constructs a request to fetch user organizations with tenant and user ID.
	 *
	 * @param params - Parameters including tenantId, userId, and token for authentication.
	 * @returns A promise that resolves to a pagination response of user organizations.
	 */
	getUserOrganizations = async (params: { tenantId: string; userId: string; token: string }) => {
		// Create a new instance of URLSearchParams for query string construction
		const query = new URLSearchParams();

		// Add user and tenant IDs to the query
		query.append('where[userId]', params.userId);
		query.append('where[tenantId]', params.tenantId);

		// If there are relations, add them to the query
		const relations: string[] = [];
		// Append each relation to the query string
		relations.forEach((relation, index) => {
			query.append(`relations[${index}]`, relation);
		});

		return this.get<PaginationResponse<IUserOrganization>>(`/user-organization?${query.toString()}`, {
			tenantId: params.tenantId,
			headers: {
				Authorization: `Bearer ${params.token}`
			}
		});
	};
}

export const userOrganizationService = new UserOrganizationService(GAUZY_API_BASE_SERVER_URL.value);
