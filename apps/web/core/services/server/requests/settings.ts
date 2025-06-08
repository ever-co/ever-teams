import { serverFetch } from '../fetch';

export function updateUserAvatarRequest<TUser>(
	{ data, id, tenantId }: { data: TUser; id: string; tenantId: string },
	bearer_token: string
) {
	// const init = {};
	return serverFetch({
		path: `/user/${id}`,
		method: 'PUT',
		body: data,
		bearer_token,
		tenantId
	});
}
