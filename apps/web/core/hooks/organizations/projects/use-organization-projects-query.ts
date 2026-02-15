'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAtom } from 'jotai';
import { useQuery } from '@tanstack/react-query';
import { organizationProjectsState } from '@/core/stores/projects/organization-projects';
import { organizationProjectService } from '@/core/services/client/api/organizations';
import { queryKeys } from '@/core/query/keys';
import { useConditionalUpdateEffect } from '../../common';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useInvalidateOrganizationProjects } from './use-invalidate-organization-projects';

/**
 * Hook for read-only organization projects operations.
 * Provides projects data fetching, search/filter, loading states, and Jotai synchronization.
 *
 * @returns {Object} An object containing:
 * - `organizationProjects` - Array of organization projects (from Jotai)
 * - `setOrganizationProjects` - Setter for Jotai state
 * - `getOrganizationProjectsLoading` - Loading state for projects list query
 * - `getOrganizationProjects` - Function returning cached projects data
 * - `getOrganizationProject` - Function to fetch a single project by ID
 * - `firstLoadOrganizationProjectsData` - First load handler
 * - `setSearchQueries` - Setter for search/filter queries
 * - `filteredOrganizations` - React Query result for filtered projects
 */
export function useOrganizationProjectsQuery() {
	const { tenantId, organizationId, queryClient } = useInvalidateOrganizationProjects();
	const [organizationProjects, setOrganizationProjects] = useAtom(organizationProjectsState);
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

	// Filtered query: fetch projects matching search queries
	const filteredOrganizations = useQuery({
		queryKey: [queryKeys.organizationProjects.all, queryKeys.organizationProjects.withQueries(memoizedSearchQueries)],
		queryFn: () =>
			organizationProjectService.getOrganizationProjects({
				queries: memoizedSearchQueries ?? undefined
			}),
		enabled: !!memoizedSearchQueries
	});

	// ==================== JOTAI SYNCHRONIZATION ====================

	useConditionalUpdateEffect(
		() => {
			if (organizationProjectsQuery.data?.items) {
				setOrganizationProjects(organizationProjectsQuery.data.items);
			}
		},
		[organizationProjectsQuery.data?.items],
		Boolean(organizationProjects?.length)
	);

	// ==================== CALLBACKS ====================

	const getOrganizationProjects = useCallback(async () => {
		return organizationProjectsQuery.data;
	}, [organizationProjectsQuery]);

	const getOrganizationProject = useCallback(
		async (id: string) => {
			try {
				const result = await queryClient.fetchQuery({
					queryKey: [queryKeys.organizationProjects.all, id],
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
			if (organizationProjects.length) return;

			return await organizationProjectsQuery.refetch();
		} catch (error) {
			console.error('Failed to load organization projects', error);
		}
	}, [user, organizationProjects, organizationProjectsQuery]);

	const handleFirstLoad = useCallback(async () => {
		await loadOrganizationProjects();
	}, [loadOrganizationProjects]);

	return {
		organizationProjects,
		setOrganizationProjects,
		getOrganizationProjectsLoading: organizationProjectsQuery.isLoading,
		getOrganizationProjects,
		getOrganizationProject,
		firstLoadOrganizationProjectsData: handleFirstLoad,
		setSearchQueries,
		filteredOrganizations
	};
}

