'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { roleService } from '@/core/services/client/api/roles';
import { queryKeys } from '@/core/query/keys';
import { getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { ERoleName } from '@/core/types/generics/enums/role';
import { useUserQuery } from '../queries/user-user.query';
import { useScopeGuard } from '../bootstrap/use-scope-guard';
import { useReactiveAccessTokenCookie } from '../auth/use-reactive-access-token-cookie';
import { CREDENTIAL_SCOPED_QUERY_META } from '@/core/query/credential-query';

export interface UseRolesQueryOptions {
	enabled?: boolean;
}

/**
 * Hook for reading roles data (READ only).
 * Replaces direct `useAtomValue(rolesState)` usage across the app.
 *
 * @returns Object containing roles array, loading state, and refetch callback
 */
export function useRolesQuery({ enabled = true }: UseRolesQueryOptions = {}) {
	const { data: user } = useUserQuery();
	const isAdmin = user?.role?.name
		? [ERoleName.ADMIN, ERoleName.SUPER_ADMIN].includes(user.role.name as ERoleName)
		: false;

	const tenantId = getTenantIdCookie();
	const accessToken = useReactiveAccessTokenCookie();
	const scope = {
		tenantId,
		userId: user?.id,
		accessToken
	};
	const queryKey = queryKeys.roles.byTenant(scope.tenantId);
	const ownerActive = enabled;
	const queryEnabled = ownerActive && isAdmin && !!(scope.tenantId && scope.userId && scope.accessToken);
	useScopeGuard(queryKey, ownerActive);

	const {
		data: rolesData,
		isLoading,
		isSuccess
	} = useQuery({
		queryKey,
		meta: CREDENTIAL_SCOPED_QUERY_META,
		queryFn: ({ signal }) => roleService.getRoles({ scope, signal }),
		enabled: queryEnabled,
		staleTime: 1000 * 60 * 10, // 10 minutes — roles are relatively stable
		gcTime: 1000 * 60 * 30 // 30 minutes
	});

	// Stable memoized reference — prevents re-render cascades in consumers
	const roles = useMemo(() => (isSuccess ? (rolesData?.items ?? []) : []), [rolesData?.items, isSuccess]);

	return {
		roles,
		isLoading,
		isSuccess
	};
}
