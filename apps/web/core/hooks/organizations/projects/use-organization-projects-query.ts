'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { organizationProjectService } from '@/core/services/client/api/organizations';
import { queryKeys } from '@/core/query/keys';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useInvalidateOrganizationProjects } from './use-invalidate-organization-projects';
import { useScopeGuard } from '../../bootstrap/use-scope-guard';
import { useReactiveAccessTokenCookie } from '../../auth/use-reactive-access-token-cookie';
import { CREDENTIAL_SCOPED_QUERY_META } from '@/core/query/credential-query';

export interface UseOrganizationProjectsQueryOptions {
	enabled?: boolean;
}

/**
 * Hook for read-only organization projects operations.
 * Provides projects data fetching, search/filter, and loading states.
 * React Query is the single source of truth — no Jotai synchronization.
 *
 * @returns {Object} An object containing:
 * - `organizationProjects` - Array of organization projects (from React Query cache)
 * - `getOrganizationProjectsLoading` - Loading state for projects list query
 * - `getOrganizationProject` - Function to fetch a single project by ID
 * - `firstLoadOrganizationProjectsData` - First load handler
 * - `setSearchQueries` - Setter for search/filter queries
 * - `filteredOrganizations` - React Query result for filtered projects
 */
export function useOrganizationProjectsQuery({ enabled = true }: UseOrganizationProjectsQueryOptions = {}) {
	const { tenantId, organizationId, queryClient } = useInvalidateOrganizationProjects();
	const { data: user } = useUserQuery();
	const [searchQueries, setSearchQueries] = useState<Record<string, string> | null>(null);
	const memoizedSearchQueries = useMemo(() => searchQueries, [JSON.stringify(searchQueries)]);
	const reactiveAccessToken = useReactiveAccessTokenCookie();
	const accessToken = reactiveAccessToken;
	const scope = useMemo(
		() => ({ tenantId, organizationId, userId: user?.id, accessToken }),
		[accessToken, organizationId, tenantId, user?.id]
	);
	const mainQueryKey = queryKeys.organizationProjects.byScope(scope.tenantId, scope.organizationId);
	const filteredQueryKey = queryKeys.organizationProjects.withQueriesByScope(
		scope.tenantId,
		scope.organizationId,
		memoizedSearchQueries
	);
	const ownerActive = enabled;
	const queryEnabled = ownerActive && !!(scope.tenantId && scope.organizationId && scope.userId && scope.accessToken);
	useScopeGuard(mainQueryKey, ownerActive);
	useScopeGuard(filteredQueryKey, ownerActive && !!memoizedSearchQueries);

	// ==================== QUERIES ====================

	// Main query: fetch all organization projects
	const organizationProjectsQuery = useQuery({
		queryKey: mainQueryKey,
		meta: CREDENTIAL_SCOPED_QUERY_META,
		queryFn: ({ signal }) => organizationProjectService.getOrganizationProjects({ scope, signal }),
		enabled: queryEnabled
	});
	const organizationProjects = useMemo(
		() => organizationProjectsQuery?.data?.items ?? [],
		[organizationProjectsQuery?.data?.items]
	);

	// Filtered query: fetch projects matching search queries
	const filteredOrganizations = useQuery({
		queryKey: filteredQueryKey,
		meta: CREDENTIAL_SCOPED_QUERY_META,
		queryFn: ({ signal }) =>
			organizationProjectService.getOrganizationProjects({
				queries: memoizedSearchQueries ?? undefined,
				scope,
				signal
			}),
		enabled: !!memoizedSearchQueries && queryEnabled
	});

	// ==================== CALLBACKS ====================

	const getOrganizationProject = useCallback(
		async (id: string) => {
			try {
				const result = await queryClient.fetchQuery({
					queryKey: queryKeys.organizationProjects.detailByScope(tenantId, organizationId, id),
					meta: CREDENTIAL_SCOPED_QUERY_META,
					queryFn: ({ signal }) => organizationProjectService.getOrganizationProject(id, { scope, signal })
				});
				return result;
			} catch (error) {
				console.error('Failed to get the organization project', error);
			}
		},
		[organizationId, queryClient, scope, tenantId]
	);

	const loadOrganizationProjects = useCallback(async () => {
		try {
			if (!enabled || !user || !queryEnabled) return;
			if (organizationProjects?.length) return;

			return await organizationProjectsQuery?.refetch();
		} catch (error) {
			console.error('Failed to load organization projects', error);
		}
	}, [enabled, organizationProjects, organizationProjectsQuery?.refetch, queryEnabled, user]);

	const handleFirstLoad = useCallback(async () => {
		await loadOrganizationProjects();
	}, [loadOrganizationProjects]);

	return {
		organizationProjects,
		getOrganizationProjectsLoading: organizationProjectsQuery?.isLoading,
		getOrganizationProject,
		firstLoadOrganizationProjectsData: handleFirstLoad,
		setSearchQueries,
		filteredOrganizations
	};
}
