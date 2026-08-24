'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { organizationProjectService } from '@/core/services/client/api/organizations';
import { queryKeys } from '@/core/query/keys';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useInvalidateOrganizationProjects } from './use-invalidate-organization-projects';
import { FAST_APP_BOOTSTRAP } from '@/core/constants/config/constants';
import { useFastScopeGuard } from '../../bootstrap/use-fast-scope-guard';
import { useReactiveAccessTokenCookie } from '../../auth/use-reactive-access-token-cookie';

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
	const fastBootstrap = FAST_APP_BOOTSTRAP.value;
	const [searchQueries, setSearchQueries] = useState<Record<string, string> | null>(null);
	const memoizedSearchQueries = useMemo(() => searchQueries, [JSON.stringify(searchQueries)]);
	const reactiveAccessToken = useReactiveAccessTokenCookie();
	const accessToken = fastBootstrap ? reactiveAccessToken : undefined;
	const scope = useMemo(
		() => ({ tenantId, organizationId, userId: user?.id, accessToken }),
		[accessToken, organizationId, tenantId, user?.id]
	);
	const mainQueryKey = fastBootstrap
		? queryKeys.organizationProjects.byScope(scope.tenantId, scope.organizationId)
		: queryKeys.organizationProjects.byOrganization(organizationId, tenantId);
	const filteredQueryKey = fastBootstrap
		? queryKeys.organizationProjects.withQueriesByScope(scope.tenantId, scope.organizationId, memoizedSearchQueries)
		: [...queryKeys.organizationProjects.all, ...queryKeys.organizationProjects.withQueries(memoizedSearchQueries)];
	const fastOwnerActive = enabled && fastBootstrap;
	const fastQueryEnabled =
		fastOwnerActive && !!(scope.tenantId && scope.organizationId && scope.userId && scope.accessToken);
	useFastScopeGuard(mainQueryKey, fastOwnerActive);
	useFastScopeGuard(filteredQueryKey, fastOwnerActive && !!memoizedSearchQueries);

	// ==================== QUERIES ====================

	// Main query: fetch all organization projects
	const organizationProjectsQuery = useQuery({
		queryKey: mainQueryKey,
		queryFn: ({ signal }) =>
			fastBootstrap
				? organizationProjectService.getOrganizationProjects({ scope, signal })
				: organizationProjectService.getOrganizationProjects(),
		enabled: fastBootstrap ? fastQueryEnabled : enabled && !!organizationId && !!tenantId
	});
	const organizationProjects = useMemo(
		() => organizationProjectsQuery?.data?.items ?? [],
		[organizationProjectsQuery?.data?.items]
	);

	// Filtered query: fetch projects matching search queries
	const filteredOrganizations = useQuery({
		queryKey: filteredQueryKey,
		queryFn: ({ signal }) =>
			organizationProjectService.getOrganizationProjects(
				fastBootstrap
					? { queries: memoizedSearchQueries ?? undefined, scope, signal }
					: { queries: memoizedSearchQueries ?? undefined }
			),
		enabled: !!memoizedSearchQueries && (fastBootstrap ? fastQueryEnabled : enabled)
	});

	// ==================== CALLBACKS ====================

	const getOrganizationProject = useCallback(
		async (id: string) => {
			try {
				const result = await queryClient.fetchQuery({
					queryKey: fastBootstrap
						? queryKeys.organizationProjects.detailByScope(tenantId, organizationId, id)
						: queryKeys.organizationProjects.detail(id),
					queryFn: ({ signal }) =>
						fastBootstrap
							? organizationProjectService.getOrganizationProject(id, { scope, signal })
							: organizationProjectService.getOrganizationProject(id)
				});
				return result;
			} catch (error) {
				console.error('Failed to get the organization project', error);
			}
		},
		[fastBootstrap, organizationId, queryClient, scope, tenantId]
	);

	const loadOrganizationProjects = useCallback(async () => {
		try {
			if (!enabled || !user || (fastBootstrap && !fastQueryEnabled)) return;
			if (organizationProjects?.length) return;

			return await organizationProjectsQuery?.refetch();
		} catch (error) {
			console.error('Failed to load organization projects', error);
		}
	}, [enabled, fastBootstrap, fastQueryEnabled, user, organizationProjects, organizationProjectsQuery?.refetch]);

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
