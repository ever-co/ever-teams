import { useQuery } from '@tanstack/react-query';
import { getMyRolePermissionsRequest } from '../../requests/roles';

interface IGetMyRolePermissionsParams {
	authToken: string;
	tenantId: string;
	userId?: string;
	roleId?: string | null;
}

// A role's permissions rarely change: every task card mounts a reader, so they are not fetched again on each mount
const ROLE_PERMISSIONS_STALE_TIME = 5 * 60 * 1000;

const fetchMyRolePermissions = async ({ authToken, tenantId }: IGetMyRolePermissionsParams) => {
	const { data, response } = await getMyRolePermissionsRequest({ bearer_token: authToken, tenantId });
	const isList = Array.isArray(data);
	// An error answer is no list of permissions: the query fails instead of reporting a role without any
	if (!response.ok || !isList) {
		throw new Error(`Failed to fetch the role permissions: ${response.status}`);
	}
	return data;
};

/**
 * The permissions of the signed-in user's role, as `GET /role-permissions/me` lists them.
 *
 * Keyed on the user and the role as well as the tenant, so a session never reads another session's cached answer.
 */
const useFetchMyRolePermissions = (params: IGetMyRolePermissionsParams) => {
	const hasSession = !!params.authToken && !!params.tenantId;

	return useQuery({
		queryKey: ['rolePermissions', 'me', params.tenantId, params.userId, params.roleId],
		queryFn: () => fetchMyRolePermissions(params),
		enabled: hasSession,
		staleTime: ROLE_PERMISSIONS_STALE_TIME
	});
};

export default useFetchMyRolePermissions;
