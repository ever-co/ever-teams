import { IRole } from '../../interfaces/IEmployee';
import { IRolePermission } from '../../interfaces/IRolePermission';
import { serverFetch } from '../fetch';

export function getEmployeeRoleRequest({
	bearer_token,
	role,
	tenantId
}: {
	bearer_token: string;
	role: 'EMPLOYEE';
	tenantId: string;
}) {
	return serverFetch<IRole>({
		path: `/roles/options?name=${role}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}

/** Fetches the permissions of the signed-in user's role: the enabled ones the API checks on every request. */
export function getMyRolePermissionsRequest({ bearer_token, tenantId }: { bearer_token: string; tenantId: string }) {
	return serverFetch<IRolePermission[]>({
		path: '/role-permissions/me',
		method: 'GET',
		bearer_token,
		tenantId
	});
}
