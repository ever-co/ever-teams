import { userState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationProjectsState } from '@/core/stores/projects/organization-projects';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/index';
import { TCreateProjectRequest, TEditProjectRequest } from '@/core/types/schemas';
import { organizationProjectService } from '@/core/services/client/api/organizations';
import { queryKeys } from '@/core/query/keys';
import { useConditionalUpdateEffect } from '../../common';
import { IOrganizationProject } from '@/core/types/interfaces/project/organization-project';

export function useOrganizationProjects() {
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();
	const [organizationProjects, setOrganizationProjects] = useAtom(organizationProjectsState);
	const [user] = useAtom(userState);
	const queryClient = useQueryClient();

	// React Query for fetching organization projects
	const organizationProjectsQuery = useQuery({
		queryKey: queryKeys.organizationProjects.byOrganization(organizationId, tenantId),
		queryFn: () => organizationProjectService.getOrganizationProjects(),
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
		mutationFn: ({ id, data }: { id: string; data: TEditProjectRequest }) =>
			organizationProjectService.editOrganizationProject(id, data),
		onSuccess: invalidateOrganizationProjectsData
	});

	const editOrganizationProjectSettingMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: any }) => {
			if (!tenantId) {
				throw new Error('Required parameters missing: tenantId. Ensure you have tenantId set in cookies.');
			}
			return organizationProjectService.editOrganizationProjectSetting(id, data, tenantId);
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
			setOrganizationProjects(organizationProjectsQuery.data?.items as IOrganizationProject[]);
		},
		[organizationProjectsQuery.data],
		Boolean(organizationProjects?.length)
	);

	// Callback functions for backward compatibility
	const editOrganizationProjectSetting = useCallback(
		(id: string, data: any) => {
			try {
				return editOrganizationProjectSettingMutation.mutateAsync({ id, data });
			} catch (error) {
				console.error('Failed to edit the organization project setting', error);
			}
		},
		[editOrganizationProjectSettingMutation]
	);

	const editOrganizationProject = useCallback(
		async (id: string, data: TEditProjectRequest) => {
			try {
				return await editOrganizationProjectMutation.mutateAsync({ id, data });
			} catch (error) {
				console.error('Failed to edit the organization project', error);
			}
		},
		[editOrganizationProjectMutation]
	);

	const getOrganizationProjects = useCallback(
		async ({ queries }: { queries?: Record<string, string> } = {}) => {
			try {
				// For queries, we can use the service directly or invalidate and refetch
				if (queries && Object.keys(queries).length > 0) {
					const res = await organizationProjectService.getOrganizationProjects({ queries });

					if (res) {
						return res;
					}
				}
			} catch (error) {
				console.error('Failed to get the organization projects', error);
			}
		},
		[organizationProjectsQuery.data]
	);

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
		firstLoadOrganizationProjectsData: handleFirstLoad
	};
}
