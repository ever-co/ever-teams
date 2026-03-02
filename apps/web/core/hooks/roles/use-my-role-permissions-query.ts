'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { rolePermissionService } from '@/core/services/client/api/roles/role-permission.service';
import { queryKeys } from '@/core/query/keys';
import { getTenantIdCookie } from '@/core/lib/helpers/cookies';

/**
 * Hook for reading the current user's role permissions (READ only).
 * Also computes `myPermissions` (string[]) — replaces the derived atom `myPermissionsState`.
 *
 * @returns Object containing myRolePermissions array, myPermissions string array, and loading state
 */
export function useMyRolePermissionsQuery() {
	const tenantId = getTenantIdCookie();

	const {
		data: myRolePermissionsData,
		isLoading,
		isSuccess
	} = useQuery({
		queryKey: queryKeys.roles.myPermissions(tenantId),
		queryFn: () => rolePermissionService.getMyRolePermissions(),
		enabled: !!tenantId
	});

	// Stable memoized array reference
	const myRolePermissions = useMemo(
		() => (isSuccess ? (myRolePermissionsData ?? []) : []),
		[myRolePermissionsData, isSuccess]
	);

	// Computed permission strings — replaces derived atom `myPermissionsState`
	const myPermissions = useMemo(() => {
		const enabled = myRolePermissions.filter((p) => p.enabled && p.permission);
		return Array.from(new Set(enabled.map((p) => p.permission)));
	}, [myRolePermissions]);

	return {
		myRolePermissions,
		myPermissions,
		isLoading,
		isSuccess
	};
}

