'use client';

/* eslint-disable react-hooks/exhaustive-deps */
import { ITaskVersionCreate } from '@/core/types/interfaces/task/task-version';
import { userState, taskVersionFetchingState, taskVersionListState, activeTeamIdState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFirstLoad } from '../common/use-first-load';
import isEqual from 'lodash/isEqual';
import { getActiveTeamIdCookie, getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/index';
import { taskVersionService } from '@/core/services/client/api/tasks/task-version.service';
import { queryKeys } from '@/core/query/keys';
import { useAuthenticateUser } from '../auth';
import { useOrganizationTeams } from '../organizations';

export function useTaskVersion() {
	const [user] = useAtom(userState);
	const activeTeamId = useAtomValue(activeTeamIdState);
	const { user: authUser } = useAuthenticateUser();
	const { activeTeam } = useOrganizationTeams();
	const queryClient = useQueryClient();

	const [taskVersion, setTaskVersion] = useAtom(taskVersionListState);
	const [taskVersionFetching] = useAtom(taskVersionFetchingState);
	const { firstLoadData: firstLoadTaskVersionData } = useFirstLoad();

	const organizationId =
		authUser?.employee?.organizationId || user?.employee?.organizationId || getOrganizationIdCookie();
	const tenantId = authUser?.employee?.tenantId || user?.tenantId || getTenantIdCookie();
	const teamId = activeTeam?.id || getActiveTeamIdCookie() || activeTeamId;

	// useQuery for fetching task versions
	const taskVersionsQuery = useQuery({
		queryKey: queryKeys.taskVersions.byTeam(teamId || ''),
		queryFn: async () => {
			if (!tenantId || !organizationId) {
				return { items: [] };
			}
			const res = await taskVersionService.getTaskVersionList(tenantId, organizationId, teamId || null);
			if (!isEqual(res.data?.items || [], taskVersion)) {
				setTaskVersion(res.data?.items || []);
			}
			return res.data;
		}
	});

	const createTaskVersionMutation = useMutation({
		mutationFn: (data: ITaskVersionCreate) => {
			if (!tenantId) {
				throw new Error('Required parameters missing: tenantId is required');
			}
			return taskVersionService.createTaskVersion(data, tenantId);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.taskVersions.byTeam(teamId || '')
			});
		}
	});

	const deleteTaskVersionMutation = useMutation({
		mutationFn: (id: string) => {
			if (!tenantId) {
				throw new Error('Required parameters missing: tenantId is required');
			}
			return taskVersionService.deleteTaskVersion(id);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.taskVersions.byTeam(teamId || '')
			});
		}
	});

	const editTaskVersionMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: ITaskVersionCreate }) => {
			if (!tenantId) {
				throw new Error('Required parameters missing: tenantId is required');
			}
			return taskVersionService.editTaskVersion(id, data, tenantId);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.taskVersions.byTeam(teamId || '')
			});
		}
	});

	const loadTaskVersionData = useCallback(() => {
		return taskVersionsQuery.data;
	}, [user, activeTeamId, setTaskVersion, taskVersion]);

	return {
		loading: taskVersionFetching,
		taskVersion,
		taskVersionFetching,
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
