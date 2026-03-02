'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { rolePermissionService } from '@/core/services/client/api/roles/role-permission.service';
import { TRolePermission } from '@/core/types/schemas/role/role-permission-schema';
import { queryKeys } from '@/core/query/keys';

/**
 * Hook for reading role permissions by roleId (READ only).
 * Computes both the raw array and the formatted dictionary.
 *
 * @param roleId - The role ID to fetch permissions for
 * @returns Object containing rolePermissions array, formatted dictionary, and loading state
 */
export function useRolePermissionsQuery(roleId?: string) {
	const {
		data: rolePermissionsData,
		isLoading,
		isSuccess
	} = useQuery({
		queryKey: queryKeys.roles.permissions(roleId!),
		queryFn: () => {
			if (!roleId) return null;
			return rolePermissionService.getRolePermission(roleId);
		},
		enabled: !!roleId
	});

	// Stable memoized array reference
	const rolePermissions = useMemo(
		() => (isSuccess ? (rolePermissionsData?.items ?? []) : []),
		[rolePermissionsData?.items, isSuccess]
	);

	// Computed formatted dictionary { [permission]: TRolePermission }
	const rolePermissionsFormated = useMemo(() => {
		const formated: { [key: string]: TRolePermission } = {};
		rolePermissions.forEach((item) => {
			formated[item.permission] = item;
		});
		return formated;
	}, [rolePermissions]);

	return {
		rolePermissions,
		rolePermissionsFormated,
		isLoading,
		isSuccess
	};
}

