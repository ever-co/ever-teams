'use client';

import { useMutation } from '@tanstack/react-query';
import { rolePermissionService } from '@/core/services/client/api/roles/role-permission.service';
import { useInvalidateRolePermissions } from './use-invalidate-role-permissions';

/**
 * Hook for updating a role permission (WRITE only).
 * Invalidates role permissions cache on settled.
 *
 * @param roleId - The role ID whose permissions are being updated
 * @returns Object containing updateRolePermission mutation and loading state
 */
export function useUpdateRolePermission(roleId?: string) {
	const { invalidateRolePermissions } = useInvalidateRolePermissions();

	const updateRolePermissionMutation = useMutation({
		mutationFn: rolePermissionService.updateRolePermission,
		onSettled: () => {
			if (roleId) {
				invalidateRolePermissions(roleId);
			}
		}
	});

	return {
		updateRolePermission: updateRolePermissionMutation.mutate,
		updateRolePermissionLoading: updateRolePermissionMutation.isPending
	};
}

