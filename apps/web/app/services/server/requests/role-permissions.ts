import { IRolePermissions } from '@app/interfaces/IRolePermissions';
import { serverFetch } from '../fetch';

export function getRolePermissionsRequest({
	bearer_token,
	roleId,
	tenantId,
}: {
	bearer_token: string;
	roleId: string;
	tenantId: string;
}) {
	const params = {
		data: JSON.stringify({
			findInput: {
				roleId,
				tenantId,
			},
		}),
	};
	const query = new URLSearchParams(params);

	return serverFetch<IRolePermissions>({
		path: `/role-permissions?${query.toString()}`,
		method: 'GET',
		bearer_token,
		tenantId,
	});
}

export function updateRolePermissionRequest({
	bearer_token,
	tenantId,
	data,
}: {
	data: IRolePermissions;
	bearer_token: string;
	tenantId: string;
}) {
	return serverFetch<IRolePermissions>({
		path: `/role-permissions/${data.id}`,
		method: 'PUT',
		bearer_token,
		tenantId,
		body: data,
	});
}
