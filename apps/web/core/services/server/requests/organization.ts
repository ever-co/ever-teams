import { IOrganization, IOrganizationCreate } from '@/core/types/interfaces/organization/IOrganization';
import { IUserOrganization } from '@/core/types/interfaces/organization/IUserOrganization';
import { PaginationResponse } from '@/core/types/interfaces/global/IDataResponse';
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
 * Constructs a GET request to fetch user organizations based on tenant and user IDs.
 *
 * @param param0 - Contains the tenantId and userId.
 * @param bearerToken - The bearer token for authorization.
 * @returns A promise resolving to a pagination response of user organizations.
 * @throws Error if required parameters are missing or invalid.
 */
export function getUserOrganizationsRequest(
	{
		tenantId,
		userId
	}: {
		tenantId: string;
		userId: string;
	},
	bearerToken: string
) {
	if (!tenantId || !userId || !bearerToken) {
		throw new Error('Tenant ID, User ID, and Bearer token are required'); // Validate required parameters
	}
	// Create a new instance of URLSearchParams for query string construction
	const query = new URLSearchParams();

	// Add user and tenant IDs to the query
	query.append('where[userId]', userId);
	query.append('where[tenantId]', tenantId);

	// If there are relations, add them to the query
	const relations: string[] = [
		'organization',
		'organization.contact',
		'organization.featureOrganizations',
		'organization.featureOrganizations.feature'
	];
	// Append each relation to the query string
	relations.forEach((relation, index) => {
		query.append(`relations[${index}]`, relation);
	});

	return serverFetch<PaginationResponse<IUserOrganization>>({
		path: `/user-organization?${query.toString()}`, // Build query string
		method: 'GET', // GET request
		bearer_token: bearerToken, // Include bearer token in headers
		tenantId
	});
}
