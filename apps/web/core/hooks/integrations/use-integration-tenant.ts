import { integrationTenantService } from '@/core/services/client/api';
import { integrationTenantState } from '@/core/stores';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { useAtom } from 'jotai';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { useGitHubIntegration } from './use-github-integration';

export function useIntegrationTenant() {
	const [integrationTenant, setIntegrationTenant] = useAtom(integrationTenantState);
	const { setIntegrationGithubRepositories } = useGitHubIntegration();
	const queryClient = useQueryClient();

	// State to track current query name for React Query (only name is needed)
	const [queryName, setQueryName] = useState<string | null>(null);

	// Memoize cookies to avoid re-reading on every render
	const tenantId = useMemo(() => getTenantIdCookie() || '', []);
	const organizationId = useMemo(() => getOrganizationIdCookie() || '', []);

	// Memoize queryFn to avoid recreation on every render
	const queryFn = useCallback(() => {
		if (!queryName) throw new Error('Query name is required');
		return integrationTenantService.getIntegrationTenant(queryName);
	}, [queryName]);

	// React Query for integration tenant data with dynamic parameters
	const integrationTenantQuery = useQuery({
		queryKey: queryName
			? queryKeys.integrations.tenantByName(tenantId, organizationId, queryName)
			: ['integrations', 'tenant', 'disabled'],
		queryFn,
		enabled: !!queryName,
		staleTime: 1000 * 60 * 5, // Integration tenant data changes moderately, cache for 5 minutes
		gcTime: 1000 * 60 * 15 // Keep in cache for 15 minutes
	});

	// Sync React Query data with Jotai state for backward compatibility
	useEffect(() => {
		if (integrationTenantQuery.data?.items) {
			// Cast to any for backward compatibility with existing interfaces
			setIntegrationTenant(integrationTenantQuery.data.items as any);
		}
	}, [integrationTenantQuery.data?.items, setIntegrationTenant]);

	// Delete integration tenant mutation
	const deleteIntegrationTenantMutation = useMutation({
		mutationFn: (integrationId: string) => integrationTenantService.deleteIntegrationTenant(integrationId),
		onSuccess: () => {
			// Clear integration tenant state
			setIntegrationTenant([]);
			setIntegrationGithubRepositories(null);

			// Invalidate related queries
			if (queryName) {
				queryClient.invalidateQueries({
					queryKey: queryKeys.integrations.tenantByName(tenantId, organizationId, queryName)
				});
			}
		}
	});

	// Manual fetch function that triggers React Query (maintains backward compatibility)
	const getIntegrationTenant = useCallback(
		async (name: string) => {
			// Set query name to trigger React Query
			setQueryName(name);

			// If we already have cached data for this name, return it immediately
			const cachedData = integrationTenantQuery.data;
			if (cachedData && !integrationTenantQuery.isStale) {
				return cachedData.items || [];
			}

			// Otherwise wait for the query to complete
			const result = await integrationTenantQuery.refetch();
			return result.data?.items || [];
		},
		[integrationTenantQuery]
	);

	// Delete function using mutation (maintains backward compatibility)
	const deleteIntegrationTenant = useCallback(
		async (integrationId: string) => {
			await deleteIntegrationTenantMutation.mutateAsync(integrationId);
		},
		[deleteIntegrationTenantMutation]
	);

	return {
		loading: integrationTenantQuery.isLoading,
		getIntegrationTenant,
		integrationTenant,
		deleteIntegrationTenant,
		deleteLoading: deleteIntegrationTenantMutation.isPending,
		error: integrationTenantQuery.error || deleteIntegrationTenantMutation.error,
		isError: integrationTenantQuery.isError || deleteIntegrationTenantMutation.isError,
		refetch: integrationTenantQuery.refetch
	};
}
