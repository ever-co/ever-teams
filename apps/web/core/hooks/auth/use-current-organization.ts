import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { currentOrganizationState, currentOrganizationFetchingState } from '@/core/stores/user/user-organizations';
import { useAtom } from 'jotai';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { organizationService } from '@/core/services/client/api/organizations';
import { useEffect } from 'react';
import { FAST_APP_BOOTSTRAP } from '@/core/constants/config/constants';
import { useFastScopeGuard } from '../bootstrap/use-fast-scope-guard';
import { useReactiveAccessTokenCookie } from './use-reactive-access-token-cookie';
import { FAST_CREDENTIAL_QUERY_META } from '@/core/query/fast-credential-query';

export interface UseGetCurrentOrganizationOptions {
	enabled?: boolean;
}

export const useGetCurrentOrganization = ({ enabled = true }: UseGetCurrentOrganizationOptions = {}) => {
	const [, setCurrentOrganization] = useAtom(currentOrganizationState);
	const [, setCurrentOrganizationFetching] = useAtom(currentOrganizationFetchingState);
	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();
	const fastBootstrap = FAST_APP_BOOTSTRAP.value;
	const accessToken = useReactiveAccessTokenCookie();
	const scope = {
		tenantId,
		organizationId,
		accessToken: fastBootstrap ? accessToken : undefined
	};
	const queryKey = fastBootstrap
		? queryKeys.workspaces.currentOrganizationByScope(tenantId, organizationId)
		: queryKeys.workspaces.currentOrganization(organizationId);
	const fastOwnerActive = enabled && fastBootstrap;
	const fastQueryEnabled = fastOwnerActive && !!(scope.tenantId && scope.organizationId && scope.accessToken);
	const isCurrentScope = useFastScopeGuard(queryKey, fastOwnerActive);

	const currentOrganizationQuery = useQuery({
		queryKey,
		meta: fastBootstrap ? FAST_CREDENTIAL_QUERY_META : undefined,
		queryFn: async ({ signal }) => {
			return fastBootstrap
				? await organizationService.getOrganizationById(organizationId, { scope, signal })
				: await organizationService.getOrganizationById(organizationId);
		},
		enabled: fastBootstrap ? fastQueryEnabled : enabled && !!organizationId,
		staleTime: 1000 * 60 * 60, // 1h
		gcTime: 1000 * 60 * 60 * 2, // 2h
		retry: 2
	});

	// Fast mode keeps feature-owned atoms isolated when the authenticated scope changes.
	useEffect(() => {
		if (fastOwnerActive && isCurrentScope()) {
			setCurrentOrganization(null);
		}
	}, [fastOwnerActive, isCurrentScope, organizationId, setCurrentOrganization, tenantId]);

	// Sync React Query data with Jotai state
	useEffect(() => {
		if (enabled && currentOrganizationQuery.data && (!fastBootstrap || isCurrentScope())) {
			setCurrentOrganization(currentOrganizationQuery.data);
		}
	}, [currentOrganizationQuery.data, enabled, fastBootstrap, isCurrentScope, setCurrentOrganization]);

	// Track fetching state
	useEffect(() => {
		if (enabled && (!fastBootstrap || isCurrentScope())) {
			setCurrentOrganizationFetching(currentOrganizationQuery.isLoading);
		}
	}, [currentOrganizationQuery.isLoading, enabled, fastBootstrap, isCurrentScope, setCurrentOrganizationFetching]);

	useEffect(() => {
		return () => {
			if (fastBootstrap && isCurrentScope()) {
				setCurrentOrganizationFetching(false);
			}
		};
	}, [fastBootstrap, isCurrentScope, setCurrentOrganizationFetching]);
};
