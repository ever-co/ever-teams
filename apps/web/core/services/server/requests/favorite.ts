import { IFavorite, IFavoriteCreateRequest } from '@/core/types/interfaces/common/favorite';
import { DeleteResponse, PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { serverFetch } from '../fetch';

export function createFavoriteRequest({
	data,
	bearer_token,
	tenantId
}: {
	data: IFavoriteCreateRequest;
	bearer_token: string;
	tenantId: string;
}) {
	return serverFetch<IFavorite>({
		path: '/favorite',
		method: 'POST',
		body: data,
		bearer_token,
		tenantId
	});
}

export function getFavoritesByEmployeeRequest({
	query,
	bearer_token,
	tenantId
}: {
	query: string;
	bearer_token: string;
	tenantId: string;
}) {
	return serverFetch<PaginationResponse<IFavorite>>({
		path: `/favorite/employee?${query}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}

export function deleteFavoriteRequest({
	id,
	bearer_token,
	tenantId
}: {
	id: string;
	bearer_token: string;
	tenantId: string;
}) {
	return serverFetch<DeleteResponse>({
		path: `/favorite/${encodeURIComponent(id)}`,
		method: 'DELETE',
		bearer_token,
		tenantId
	});
}
