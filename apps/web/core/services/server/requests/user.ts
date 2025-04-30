import { IUser } from '@/core/types/interfaces';
import { serverFetch } from '../fetch';

export function getUserByIdRequest({
	id,
	bearer_token,
	tenantId
}: {
	id: string | any;
	bearer_token: string | any;
	tenantId?: string;
}) {
	return serverFetch<IUser>({
		path: `/user/${id}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}

export function deleteUserRequest({
	id,
	bearer_token,
	tenantId
}: {
	id: string | any;
	bearer_token: string | any;
	tenantId?: string;
}) {
	return serverFetch<any>({
		path: `/user/${id}`,
		method: 'DELETE',
		bearer_token,
		tenantId
	});
}

export function resetUserRequest({ bearer_token, tenantId }: { bearer_token: string | any; tenantId?: string }) {
	return serverFetch<any>({
		path: `/user/reset`,
		method: 'DELETE',
		bearer_token,
		tenantId
	});
}
