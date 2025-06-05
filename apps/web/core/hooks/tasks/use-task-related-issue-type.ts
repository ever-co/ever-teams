'use client';

import { userState, taskRelatedIssueTypeListState, activeTeamIdState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFirstLoad } from '../common/use-first-load';
import { getActiveTeamIdCookie, getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/index';
import { taskRelatedIssueTypeService } from '@/core/services/client/api/tasks/task-related-issue-type.service';
import { ITaskRelatedIssueTypeCreate } from '@/core/types/interfaces/task/related-issue-type';
import { queryKeys } from '@/core/query/keys';
import { useAuthenticateUser } from '../auth';
import { useOrganizationTeams } from '../organizations';
import { useConditionalUpdateEffect } from '../common';

export function useTaskRelatedIssueType() {
	const [user] = useAtom(userState);
	const activeTeamId = useAtomValue(activeTeamIdState);
	const { user: authUser } = useAuthenticateUser();
	const { activeTeam } = useOrganizationTeams();
	const queryClient = useQueryClient();

	const [taskRelatedIssueType, setTaskRelatedIssueType] = useAtom(taskRelatedIssueTypeListState);
	const { firstLoadData: firstLoadTaskRelatedIssueTypeData } = useFirstLoad();

	const organizationId =
		authUser?.employee?.organizationId || user?.employee?.organizationId || getOrganizationIdCookie();
	const tenantId = authUser?.employee?.tenantId || user?.tenantId || getTenantIdCookie();
	const teamId = activeTeam?.id || getActiveTeamIdCookie() || activeTeamId;

	// useQuery for fetching task related issue types
	const taskRelatedIssueTypesQuery = useQuery({
		queryKey: queryKeys.taskRelatedIssueTypes.byTeam(teamId),
		queryFn: async () => {
			if (!tenantId || !organizationId || !teamId) {
				throw new Error('Required parameters missing: tenantId, organizationId, and teamId are required');
			}
			const res = await taskRelatedIssueTypeService.getTaskRelatedIssueTypeList(tenantId, organizationId, teamId);
			return res.data;
		},
		enabled: !!tenantId && !!organizationId && !!teamId
	});

	const createTaskRelatedIssueTypeMutation = useMutation({
		mutationFn: (data: ITaskRelatedIssueTypeCreate) => {
			if (!tenantId || !teamId) {
				throw new Error('Required parameters missing: tenantId, teamId is required');
			}
			const requestData = { ...data, organizationTeamId: teamId };
			return taskRelatedIssueTypeService.createTaskRelatedIssueType(requestData, tenantId);
		},
		onSuccess: () => {
			teamId &&
				queryClient.invalidateQueries({
					queryKey: queryKeys.taskRelatedIssueTypes.byTeam(teamId)
				});
		}
	});

	const deleteTaskRelatedIssueTypeMutation = useMutation({
		mutationFn: (id: string) => taskRelatedIssueTypeService.deleteTaskRelatedIssueType(id),
		onSuccess: () => {
			teamId &&
				queryClient.invalidateQueries({
					queryKey: queryKeys.taskRelatedIssueTypes.byTeam(teamId)
				});
		}
	});

	const editTaskRelatedIssueTypeMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: ITaskRelatedIssueTypeCreate }) => {
			if (!tenantId || !teamId) {
				throw new Error('Required parameters missing: tenantId, teamId is required');
			}
			return taskRelatedIssueTypeService.editTaskRelatedIssueType(id, data, tenantId);
		},
		onSuccess: () => {
			teamId &&
				queryClient.invalidateQueries({
					queryKey: queryKeys.taskRelatedIssueTypes.byTeam(teamId)
				});
		}
	});

	useConditionalUpdateEffect(
		() => {
			if (taskRelatedIssueTypesQuery.data) {
				setTaskRelatedIssueType(taskRelatedIssueTypesQuery.data.items);
			}
		},
		[taskRelatedIssueTypesQuery.data],
		Boolean(taskRelatedIssueType?.length)
	);

	const loadTaskRelatedIssueTypeData = useCallback(async () => {
		return taskRelatedIssueTypesQuery.data;
	}, [taskRelatedIssueTypesQuery.data]);

	const handleFirstLoad = useCallback(async () => {
		await loadTaskRelatedIssueTypeData();
		firstLoadTaskRelatedIssueTypeData();
	}, [firstLoadTaskRelatedIssueTypeData, loadTaskRelatedIssueTypeData]);

	return {
		taskRelatedIssueTypes: taskRelatedIssueType,
		loading: taskRelatedIssueTypesQuery.isLoading,
		firstLoadTaskRelatedIssueTypeData: handleFirstLoad,
		createTaskRelatedIssueType: createTaskRelatedIssueTypeMutation.mutateAsync,
		createTaskRelatedIssueTypeLoading: createTaskRelatedIssueTypeMutation.isPending,
		deleteTaskRelatedIssueTypeLoading: deleteTaskRelatedIssueTypeMutation.isPending,
		deleteTaskRelatedIssueType: deleteTaskRelatedIssueTypeMutation.mutateAsync,
		editTaskRelatedIssueTypeLoading: editTaskRelatedIssueTypeMutation.isPending,
		editTaskRelatedIssueType: (id: string, data: ITaskRelatedIssueTypeCreate) =>
			editTaskRelatedIssueTypeMutation.mutateAsync({ id, data }),
		setTaskRelatedIssueType,
		loadTaskRelatedIssueTypeData
	};
}
