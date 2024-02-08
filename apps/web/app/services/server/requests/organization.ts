import { PaginationResponse } from '@app/interfaces/IDataResponse';
import { IOrganization, IOrganizationCreate, IUserOrganization } from '@app/interfaces/IOrganization';
import { serverFetch } from '../fetch';

export function createOrganizationRequest(datas: IOrganizationCreate, bearer_token: string) {
	return serverFetch<IOrganization>({
		path: '/organization',
		method: 'POST',
		body: datas,
		bearer_token
	});
}

export function getUserOrganizationsRequest(
	{ tenantId, userId }: { tenantId: string; userId: string },
	bearer_token: string
) {
	const query = JSON.stringify({
		relations: [],
		findInput: {
			userId,
			tenantId
		}
	});

	return serverFetch<PaginationResponse<IUserOrganization>>({
		path: `/user-organization?data=${encodeURIComponent(query)}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}
