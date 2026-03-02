import { useRolePermissionsQuery } from './use-role-permissions-query';
import { useMyRolePermissionsQuery } from './use-my-role-permissions-query';
import { useUpdateRolePermission } from './use-update-role-permission';
import { useInvalidateRolePermissions } from './use-invalidate-role-permissions';

/**
 * @deprecated Use granular hooks instead:
 * - `useRolePermissionsQuery(roleId)` for reading role permissions
 * - `useMyRolePermissionsQuery()` for reading current user's permissions
 * - `useUpdateRolePermission(roleId)` for updating a permission
 * - `useInvalidateRolePermissions()` for cache invalidation
 */
export const useRolePermissions = (roleId?: string) => {
	const { rolePermissions, rolePermissionsFormated, isLoading } = useRolePermissionsQuery(roleId);
	const { myRolePermissions } = useMyRolePermissionsQuery();
	const { updateRolePermission, updateRolePermissionLoading } = useUpdateRolePermission(roleId);
	const { invalidateRolePermissions, invalidateMyRolePermissions } = useInvalidateRolePermissions();

	return {
		loading: isLoading,
		rolePermissions,
		getRolePermissions: invalidateRolePermissions,
		updateRolePermission,
		updateRolePermissionLoading,
		rolePermissionsFormated,
		myRolePermissions,
		getMyRolePermissions: invalidateMyRolePermissions,
		firstLoadMyRolePermissionsData: invalidateMyRolePermissions
	};
};
