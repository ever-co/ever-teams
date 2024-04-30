import { PaginationResponse } from '../../interfaces/IDataResponse';
import { IOrganization, IOrganizationCreate, IUserOrganization } from '../../interfaces/IOrganization';
import { serverFetch } from '../fetch';

export function createOrganizationRequest(datas: IOrganizationCreate, bearerToken: string) {
	return serverFetch<IOrganization>({
		path: '/organization',
		method: 'POST',
		body: datas,
		bearer_token: bearerToken
	});
}

/**
 * Constructs a request to fetch user organizations based on tenant and user ID.
 *
 * @param param0 - Object containing tenantId and userId.
 * @param bearer_token - Bearer token for authorization.
 * @returns A promise resolving to a pagination response of user organizations.
 */
export function getUserOrganizationsRequest(
	{ tenantId, userId }: { tenantId: string; userId: string },
	bearerToken: string
) {
	if (!tenantId || !userId || !bearerToken) {
		throw new Error('Tenant ID, User ID, and Bearer token are required'); // Validate parameters
	}

	// Create query string instance
	const query = new URLSearchParams();

	// Add tenant and user IDs to the query
	query.append('where[userId]', userId);
	query.append('where[tenantId]', tenantId);

	// Relations to be included in the query
	const relations: string[] = []; // You can define relations based on context

	// Append each relation to the query string
	relations.forEach((relation, index) => {
		query.append(`relations[${index}]`, relation);
	});

	// Construct the request with the bearer token and additional parameters
	return serverFetch<PaginationResponse<IUserOrganization>>({
		path: `/user-organization?${query.toString()}`, // Use toString() for query
		method: 'GET',
		bearer_token: bearerToken, // Include bearer token for authorization
		tenantId // Additional context if needed
	});
}
