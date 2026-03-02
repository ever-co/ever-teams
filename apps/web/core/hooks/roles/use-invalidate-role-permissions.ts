'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { getTenantIdCookie } from '@/core/lib/helpers/cookies';

/**
 * Shared invalidation hook for role permissions cache.
 * Used by mutation hooks to ensure cache consistency.
 */
export function useInvalidateRolePermissions() {
	const queryClient = useQueryClient();
	const tenantId = getTenantIdCookie();

	const invalidateRolePermissions = useCallback(
		(roleId: string) => queryClient.invalidateQueries({ queryKey: queryKeys.roles.permissions(roleId) }),
		[queryClient]
	);

	const invalidateMyRolePermissions = useCallback(
		() => queryClient.invalidateQueries({ queryKey: queryKeys.roles.myPermissions(tenantId) }),
		[queryClient, tenantId]
	);

	return { invalidateRolePermissions, invalidateMyRolePermissions };
}

