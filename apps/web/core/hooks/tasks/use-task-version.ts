'use client';

/* eslint-disable react-hooks/exhaustive-deps */
import { ITaskVersionCreate } from '@/core/types/interfaces/task/task-version';
import { userState, taskVersionListState, activeTeamIdState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFirstLoad } from '../common/use-first-load';
import { getActiveTeamIdCookie, getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/index';
import { taskVersionService } from '@/core/services/client/api/tasks/task-version.service';
import { queryKeys } from '@/core/query/keys';
import { useAuthenticateUser } from '../auth';
import { useOrganizationTeams } from '../organizations';
import { useConditionalUpdateEffect } from '../common';

export function useTaskVersion() {
	const [user] = useAtom(userState);
	const activeTeamId = useAtomValue(activeTeamIdState);
	const { user: authUser } = useAuthenticateUser();
	const { activeTeam } = useOrganizationTeams();
	const queryClient = useQueryClient();

	const [taskVersion, setTaskVersion] = useAtom(taskVersionListState);
	const { firstLoadData: firstLoadTaskVersionData } = useFirstLoad();

	const organizationId =
		authUser?.employee?.organizationId || user?.employee?.organizationId || getOrganizationIdCookie();
	const tenantId = authUser?.employee?.tenantId || user?.tenantId || getTenantIdCookie();
	const teamId = activeTeam?.id || getActiveTeamIdCookie() || activeTeamId;

	// useQuery for fetching task versions
	const taskVersionsQuery = useQuery({
		queryKey: queryKeys.taskVersions.byTeam(teamId),
		queryFn: async () => {
			if (!tenantId || !organizationId || !teamId) {
				throw new Error('Required parameters missing: tenantId, organizationId, and teamId are required');
			}
			const res = await taskVersionService.getTaskVersionList(tenantId, organizationId, teamId);
			return res.data;
		}
	});

	const createTaskVersionMutation = useMutation({
		mutationFn: (data: ITaskVersionCreate) => {
			if (!tenantId || !teamId) {
				throw new Error('Required parameters missing: tenantId, teamId is required');
			}
			return taskVersionService.createTaskVersion(data, tenantId);
		},
		onSuccess: () => {
			teamId &&
				queryClient.invalidateQueries({
					queryKey: queryKeys.taskVersions.byTeam(teamId)
				});
		}
	});

	const deleteTaskVersionMutation = useMutation({
		mutationFn: (id: string) => {
			return taskVersionService.deleteTaskVersion(id);
		},
		onSuccess: () => {
			teamId &&
				queryClient.invalidateQueries({
					queryKey: queryKeys.taskVersions.byTeam(teamId)
				});
		}
	});

	const editTaskVersionMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: ITaskVersionCreate }) => {
			if (!tenantId || !teamId) {
				throw new Error('Required parameters missing: tenantId, teamId is required');
			}
			return taskVersionService.editTaskVersion(id, data, tenantId);
		},
		onSuccess: () => {
			teamId &&
				queryClient.invalidateQueries({
					queryKey: queryKeys.taskVersions.byTeam(teamId)
				});
		}
	});

	useConditionalUpdateEffect(
		() => {
			if (taskVersionsQuery.data) {
				setTaskVersion(taskVersionsQuery.data.items);
			}
		},
		[taskVersionsQuery.data],
		Boolean(taskVersion?.length)
	);

	const loadTaskVersionData = useCallback(() => {
		return taskVersionsQuery.data;
	}, [taskVersionsQuery.data]);

	return {
		loading: taskVersionsQuery.isLoading,
		taskVersion,
		taskVersionFetching: taskVersionsQuery.isPending,
		firstLoadTaskVersionData,
		createTaskVersion: createTaskVersionMutation.mutateAsync,
		createTaskVersionLoading: createTaskVersionMutation.isPending,
		deleteTaskVersionLoading: deleteTaskVersionMutation.isPending,
		deleteTaskVersion: deleteTaskVersionMutation.mutateAsync,
		editTaskVersionLoading: editTaskVersionMutation.isPending,
		editTaskVersion: (id: string, data: ITaskVersionCreate) => editTaskVersionMutation.mutateAsync({ id, data }),
		setTaskVersion,
		loadTaskVersionData
	};
}
