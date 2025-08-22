import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useCallback, useMemo, useState } from 'react';
import { useAtom } from 'jotai';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationProjectsState } from '@/core/stores/projects/organization-projects';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/index';
import { TCreateProjectRequest, TEditProjectRequest } from '@/core/types/schemas';
import { organizationProjectService } from '@/core/services/client/api/organizations';
import { queryKeys } from '@/core/query/keys';
import { useConditionalUpdateEffect } from '../../common';

// Simple pagination params type
interface PaginationParams {
	skip?: number;
	take?: number;
}

export function useOrganizationProjects() {
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();
	const [organizationProjects, setOrganizationProjects] = useAtom(organizationProjectsState);
	const { data: user } = useUserQuery();
	const queryClient = useQueryClient();
	const [searchQueries, setSearchQueries] = useState<Record<string, string> | null>(null);
	const memoizedSearchQueries = useMemo(() => searchQueries, [JSON.stringify(searchQueries)]);

	// State for enhanced pagination
	const [paginationParams, setPaginationParams] = useState<PaginationParams>({
		skip: 0,
		take: 20
	});

	// React Query for fetching organization projects
	const organizationProjectsQuery = useQuery({
		queryKey: queryKeys.organizationProjects.byOrganization(organizationId, tenantId),
		queryFn: () => organizationProjectService.getOrganizationProjects(),
		enabled: !!organizationId && !!tenantId
	});

	const filteredOrganizations = useQuery({
		queryKey: [
			queryKeys.organizationProjects.all,
			queryKeys.organizationProjects.withQueries(memoizedSearchQueries)
		],
		queryFn: () =>
			organizationProjectService.getOrganizationProjects({
				queries: memoizedSearchQueries ?? undefined
			}),
		enabled: !!memoizedSearchQueries
	});

	// Enhanced query with pagination using the existing method
	const organizationProjectsWithPagination = useQuery({
		queryKey: [queryKeys.organizationProjects.all, 'pagination', paginationParams],
		queryFn: () =>
			organizationProjectService.getOrganizationProjects({
				skip: paginationParams.skip,
				take: paginationParams.take
			}),
		enabled: !!organizationId && !!tenantId
	});

	// Invalidation helper
	const invalidateOrganizationProjectsData = useCallback(
		() =>
			queryClient.invalidateQueries({
				queryKey: queryKeys.organizationProjects.byOrganization(organizationId, tenantId)
			}),
		[queryClient, organizationId, tenantId]
	);

	// Mutations
	const editOrganizationProjectMutation = useMutation({
		mutationFn: ({ projectId, data }: { projectId: string; data: TEditProjectRequest }) =>
			organizationProjectService.editOrganizationProject({ organizationProjectId: projectId, data }),
		onSuccess: invalidateOrganizationProjectsData
	});

	const editOrganizationProjectSettingMutation = useMutation({
		mutationFn: ({ projectId, data }: { projectId: string; data: any }) => {
			if (!tenantId) {
				throw new Error('Required parameters missing: tenantId. Ensure you have tenantId set in cookies.');
			}
			return organizationProjectService.editOrganizationProjectSetting({
				organizationProjectId: projectId,
				data
			});
		},
		onSuccess: invalidateOrganizationProjectsData
	});

	const createOrganizationProjectMutation = useMutation({
		mutationFn: (data: Partial<TCreateProjectRequest>) =>
			organizationProjectService.createOrganizationProject({ ...data, organizationId, tenantId }),
		onSuccess: invalidateOrganizationProjectsData
	});

	const deleteOrganizationProjectMutation = useMutation({
		mutationFn: (id: string) => organizationProjectService.deleteOrganizationProject(id),
		onSuccess: invalidateOrganizationProjectsData
	});

	// Sync React Query data with Jotai state
	useConditionalUpdateEffect(
		() => {
			if (organizationProjectsQuery.data?.items) {
				setOrganizationProjects(organizationProjectsQuery.data.items);
			}
		},
		[organizationProjectsQuery.data?.items],
		Boolean(organizationProjects?.length)
	);

	// Callback functions for backward compatibility
	const editOrganizationProjectSetting = useCallback(
		(id: string, data: any) => {
			try {
				return editOrganizationProjectSettingMutation.mutateAsync({ projectId: id, data });
			} catch (error) {
				console.error('Failed to edit the organization project setting', error);
			}
		},
		[editOrganizationProjectSettingMutation]
	);

	const editOrganizationProject = useCallback(
		async (id: string, data: TEditProjectRequest) => {
			try {
				return await editOrganizationProjectMutation.mutateAsync({ projectId: id, data });
			} catch (error) {
				console.error('Failed to edit the organization project', error);
			}
		},
		[editOrganizationProjectMutation]
	);

	const getOrganizationProjects = useCallback(async () => {
		return organizationProjectsQuery.data;
	}, [organizationProjectsQuery]);

	const createOrganizationProject = useCallback(
		async (data: Partial<TCreateProjectRequest>) => {
			try {
				const res = await createOrganizationProjectMutation.mutateAsync(data);
				return res;
			} catch (error) {
				console.error('Failed to create the organization project', error);
			}
		},
		[createOrganizationProjectMutation]
	);

	const deleteOrganizationProject = useCallback(
		async (id: string) => {
			try {
				return await deleteOrganizationProjectMutation.mutateAsync(id);
			} catch (error) {
				console.error(error);
			}
		},
		[deleteOrganizationProjectMutation]
	);

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

			// Trigger refetch of the query
			return await organizationProjectsQuery.refetch();
		} catch (error) {
			console.error('Failed to load organization projects', error);
		}
	}, [user, organizationProjects, organizationProjectsQuery]);

	const handleFirstLoad = useCallback(async () => {
		await loadOrganizationProjects();
	}, [loadOrganizationProjects]);

	// Enhanced pagination functions
	const updatePaginationParams = useCallback((newParams: Partial<PaginationParams>) => {
		setPaginationParams((prev: PaginationParams) => ({ ...prev, ...newParams }));
	}, []);

	const resetPagination = useCallback(() => {
		setPaginationParams({ skip: 0, take: 20 });
	}, []);

	const loadNextPage = useCallback(() => {
		setPaginationParams((prev: PaginationParams) => ({
			...prev,
			skip: (prev.skip || 0) + (prev.take || 20)
		}));
	}, []);

	const loadPreviousPage = useCallback(() => {
		setPaginationParams((prev: PaginationParams) => ({
			...prev,
			skip: Math.max(0, (prev.skip || 0) - (prev.take || 20))
		}));
	}, []);

	return {
		editOrganizationProjectSetting,
		editOrganizationProjectSettingLoading: editOrganizationProjectSettingMutation.isPending,
		editOrganizationProject,
		editOrganizationProjectLoading: editOrganizationProjectMutation.isPending,
		getOrganizationProjects,
		getOrganizationProjectsLoading: organizationProjectsQuery.isLoading,
		organizationProjects,
		createOrganizationProject,
		createOrganizationProjectLoading: createOrganizationProjectMutation.isPending,
		deleteOrganizationProject,
		deleteOrganizationProjectLoading: deleteOrganizationProjectMutation.isPending,
		setOrganizationProjects,
		firstLoadOrganizationProjectsData: handleFirstLoad,
		setSearchQueries,
		filteredOrganizations,
		getOrganizationProject,

		// Enhanced pagination API
		organizationProjectsWithPagination,
		paginationParams,
		updatePaginationParams,
		resetPagination,
		loadNextPage,
		loadPreviousPage,
		getOrganizationProjectsWithPaginationLoading: organizationProjectsWithPagination.isLoading,
		organizationProjectsWithPaginationData: organizationProjectsWithPagination.data
	};
}
