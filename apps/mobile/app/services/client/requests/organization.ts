import { PaginationResponse } from '../../interfaces/IDataResponse';
import { IOrganization, IOrganizationCreate, IUserOrganization } from '../../interfaces/IOrganization';
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
	const query = new URLSearchParams({
		relations: new URLSearchParams([]).toString(),
		findInput: new URLSearchParams({
			userId,
			tenantId
		}).toString()
	});

	return serverFetch<PaginationResponse<IUserOrganization>>({
		path: `/user-organization?data=${query.toString()}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}
