import { serverFetch } from '../fetch';

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
