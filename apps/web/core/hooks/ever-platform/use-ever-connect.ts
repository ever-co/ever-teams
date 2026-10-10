'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { isEverConnectFlagOn } from '@/core/lib/ever-platform/env';
import { queryKeys } from '@/core/query/keys';
import { CREDENTIAL_SCOPED_QUERY_META } from '@/core/query/credential-query';
import { everConnectService } from '@/core/services/client/api/ever-platform/ever-connect.service';
import { useReactiveAccessTokenCookie } from '../auth/use-reactive-access-token-cookie';
import { useUserQuery } from '../queries/user-user.query';

/** How long a `health` answer is trusted before it is asked again. */
export const EVER_CONNECT_HEALTH_STALE_MS = 5 * 60 * 1000;

/**
 * The signed-in person's scope: their own token and tenant, and the organization the settings act on.
 * Nothing is asked of the paired API without a signed-in person.
 */
function useEverPlatformScope() {
	const { data: user } = useUserQuery();
	const accessToken = useReactiveAccessTokenCookie();
	return useMemo(
		() => ({
			tenantId: user?.tenantId ?? null,
			organizationId: user?.employee?.organizationId ?? user?.lastOrganizationId ?? null,
			userId: user?.id ?? null,
			accessToken: accessToken ?? null,
			signedIn: Boolean(user?.id && accessToken)
		}),
		[user?.tenantId, user?.employee?.organizationId, user?.lastOrganizationId, user?.id, accessToken]
	);
}

/**
 * Whether the Ever Platform connection parts of the settings may show: NEXT_PUBLIC_EVER_CONNECT_ENABLED
 * is exactly 'true' AND the paired API's `GET /ever-connect/health` answers 200 to the signed-in
 * person's own token. With the flag off, or nobody signed in, nothing is asked at all; 401 and 404 both
 * mean "not available". The answer is kept for 5 minutes.
 */
export function useEverConnectAvailable(active = true) {
	const scope = useEverPlatformScope();
	const flagOn = isEverConnectFlagOn();
	const enabled = active && flagOn && scope.signedIn;
	const query = useQuery({
		queryKey: queryKeys.everPlatform.connect.health(scope.tenantId, scope.userId),
		meta: CREDENTIAL_SCOPED_QUERY_META,
		queryFn: ({ signal }) => everConnectService.health({ scope, signal }),
		enabled,
		staleTime: EVER_CONNECT_HEALTH_STALE_MS,
		retry: false,
		refetchOnWindowFocus: false
	});
	return {
		available: enabled && query.isSuccess && query.data !== null,
		connected: Boolean(enabled && query.data?.connected),
		isLoading: enabled && query.isLoading
	};
}

/** The connection parts' data: the organization's link, its integrations and its entitlement. */
export function useEverConnectData(available: boolean) {
	const scope = useEverPlatformScope();
	const enabled = available && scope.signedIn;
	const status = useQuery({
		queryKey: queryKeys.everPlatform.connect.status(scope.tenantId, scope.organizationId),
		meta: CREDENTIAL_SCOPED_QUERY_META,
		queryFn: ({ signal }) => everConnectService.status(scope.organizationId, { scope, signal }),
		enabled,
		retry: false
	});
	const integrations = useQuery({
		queryKey: queryKeys.everPlatform.connect.integrations(scope.tenantId, scope.organizationId),
		meta: CREDENTIAL_SCOPED_QUERY_META,
		queryFn: ({ signal }) => everConnectService.integrations(scope.organizationId, { scope, signal }),
		enabled,
		retry: false
	});
	const entitlement = useQuery({
		queryKey: queryKeys.everPlatform.connect.entitlement(scope.tenantId, scope.organizationId),
		meta: CREDENTIAL_SCOPED_QUERY_META,
		queryFn: ({ signal }) => everConnectService.entitlement(scope.organizationId, { scope, signal }),
		enabled,
		retry: false
	});
	return { scope, status, integrations, entitlement };
}

/** The connection parts' actions; each one refreshes what it changed. */
export function useEverConnectActions(organizationId: string | null) {
	const queryClient = useQueryClient();
	const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.everPlatform.connect.all });

	const refreshIntegrations = useMutation({
		mutationFn: () => everConnectService.refreshIntegrations(organizationId),
		onSettled: invalidate
	});
	const openConsent = useMutation({
		mutationFn: (key: string) => everConnectService.consentUrl(key, organizationId)
	});
	const disableIntegration = useMutation({
		mutationFn: (key: string) => everConnectService.disableIntegration(key, organizationId),
		onSettled: invalidate
	});
	const refreshEntitlement = useMutation({
		mutationFn: () => everConnectService.refreshEntitlement(organizationId),
		onSettled: invalidate
	});
	const addLink = useMutation({
		mutationFn: (linkCode: string) => everConnectService.addLink(linkCode, organizationId),
		onSettled: invalidate
	});
	const removeLink = useMutation({
		mutationFn: (integrationTenantId: string) => everConnectService.removeLink(integrationTenantId, organizationId),
		onSettled: invalidate
	});
	return { refreshIntegrations, openConsent, disableIntegration, refreshEntitlement, addLink, removeLink };
}

export { useEverPlatformScope };
