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

/** Fetches the permissions of the signed-in user's role, enabled and disabled alike; callers must check `enabled`. */
export function getMyRolePermissionsRequest({ bearer_token, tenantId }: { bearer_token: string; tenantId: string }) {
	return serverFetch<IRolePermission[]>({
		path: '/role-permissions/me',
		method: 'GET',
		bearer_token,
		tenantId
	});
}
