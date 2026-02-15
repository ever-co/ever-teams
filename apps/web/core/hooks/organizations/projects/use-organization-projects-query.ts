'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { organizationProjectService } from '@/core/services/client/api/organizations';
import { queryKeys } from '@/core/query/keys';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useInvalidateOrganizationProjects } from './use-invalidate-organization-projects';

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
export function useOrganizationProjectsQuery() {
	const { tenantId, organizationId, queryClient } = useInvalidateOrganizationProjects();
	const { data: user } = useUserQuery();
	const [searchQueries, setSearchQueries] = useState<Record<string, string> | null>(null);
	const memoizedSearchQueries = useMemo(() => searchQueries, [JSON.stringify(searchQueries)]);

	// ==================== QUERIES ====================

	// Main query: fetch all organization projects
	const organizationProjectsQuery = useQuery({
		queryKey: queryKeys.organizationProjects.byOrganization(organizationId, tenantId),
		queryFn: () => organizationProjectService.getOrganizationProjects(),
		enabled: !!organizationId && !!tenantId
	});
	const organizationProjects = useMemo(
		() => organizationProjectsQuery?.data?.items ?? [],
		[organizationProjectsQuery?.data?.items]
	);

	// Filtered query: fetch projects matching search queries
	const filteredOrganizations = useQuery({
		queryKey: [
			...queryKeys.organizationProjects.all,
			...queryKeys.organizationProjects.withQueries(memoizedSearchQueries)
		],
		queryFn: () =>
			organizationProjectService.getOrganizationProjects({
				queries: memoizedSearchQueries ?? undefined
			}),
		enabled: !!memoizedSearchQueries
	});

	// ==================== CALLBACKS ====================

	const getOrganizationProject = useCallback(
		async (id: string) => {
			try {
				const result = await queryClient.fetchQuery({
					queryKey: queryKeys.organizationProjects.detail(id),
					queryFn: () => organizationProjectService.getOrganizationProject(id)
				});
				return result;
			} catch (error) {
				console.error('Failed to get the organization project', error);
			}
		},
		[queryClient]
	);

	const loadOrganizationProjects = useCallback(async () => {
		try {
			if (!user) return;
			if (organizationProjects?.length) return;

			return await organizationProjectsQuery.refetch();
		} catch (error) {
			console.error('Failed to load organization projects', error);
		}
	}, [user, organizationProjects, organizationProjectsQuery.refetch]);

	const handleFirstLoad = useCallback(async () => {
		await loadOrganizationProjects();
	}, [loadOrganizationProjects]);

	return {
		organizationProjects,
		getOrganizationProjectsLoading: organizationProjectsQuery.isLoading,
		getOrganizationProject,
		firstLoadOrganizationProjectsData: handleFirstLoad,
		setSearchQueries,
		filteredOrganizations
	};
}
