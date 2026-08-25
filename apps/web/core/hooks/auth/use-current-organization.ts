import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { currentOrganizationState, currentOrganizationFetchingState } from '@/core/stores/user/user-organizations';
import { useAtom } from 'jotai';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { organizationService } from '@/core/services/client/api/organizations';
import { useEffect } from 'react';
import { useScopeGuard } from '../bootstrap/use-scope-guard';
import { useReactiveAccessTokenCookie } from './use-reactive-access-token-cookie';
import { CREDENTIAL_SCOPED_QUERY_META } from '@/core/query/credential-query';

export interface UseGetCurrentOrganizationOptions {
	enabled?: boolean;
}

export const useGetCurrentOrganization = ({ enabled = true }: UseGetCurrentOrganizationOptions = {}) => {
	const [, setCurrentOrganization] = useAtom(currentOrganizationState);
	const [, setCurrentOrganizationFetching] = useAtom(currentOrganizationFetchingState);
	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();
	const accessToken = useReactiveAccessTokenCookie();
	const scope = {
		tenantId,
		organizationId,
		accessToken
	};
	const queryKey = queryKeys.workspaces.currentOrganizationByScope(tenantId, organizationId);
	const ownerActive = enabled;
	const queryEnabled = ownerActive && !!(scope.tenantId && scope.organizationId && scope.accessToken);
	const isCurrentScope = useScopeGuard(queryKey, ownerActive);

	const currentOrganizationQuery = useQuery({
		queryKey,
		meta: CREDENTIAL_SCOPED_QUERY_META,
		queryFn: ({ signal }) => organizationService.getOrganizationById(organizationId, { scope, signal }),
		enabled: queryEnabled,
		staleTime: 1000 * 60 * 60, // 1h
		gcTime: 1000 * 60 * 60 * 2, // 2h
		retry: 2
	});

	useEffect(() => {
		if (ownerActive && isCurrentScope()) {
			setCurrentOrganization(null);
		}
	}, [isCurrentScope, organizationId, ownerActive, setCurrentOrganization, tenantId]);

	// Sync React Query data with Jotai state
	useEffect(() => {
		if (enabled && currentOrganizationQuery.data && isCurrentScope()) {
			setCurrentOrganization(currentOrganizationQuery.data);
		}
	}, [currentOrganizationQuery.data, enabled, isCurrentScope, setCurrentOrganization]);

	// Track fetching state
	useEffect(() => {
		if (enabled && isCurrentScope()) {
			setCurrentOrganizationFetching(currentOrganizationQuery.isLoading);
		}
	}, [currentOrganizationQuery.isLoading, enabled, isCurrentScope, setCurrentOrganizationFetching]);

	useEffect(() => {
		return () => {
			if (isCurrentScope()) {
				setCurrentOrganizationFetching(false);
			}
		};
	}, [isCurrentScope, setCurrentOrganizationFetching]);
};
