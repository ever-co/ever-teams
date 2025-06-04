'use client';

import { userState, taskPrioritiesListState, activeTeamIdState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFirstLoad } from '../common/use-first-load';
import { getActiveTeamIdCookie, getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/index';
import { taskPriorityService } from '@/core/services/client/api/tasks/task-priority.service';
import { ITaskPrioritiesCreate } from '@/core/types/interfaces/task/task-priority';
import { queryKeys } from '@/core/query/keys';
import { useAuthenticateUser } from '../auth';
import { useOrganizationTeams } from '../organizations';

export function useTaskPriorities() {
	const [user] = useAtom(userState);
	const activeTeamId = useAtomValue(activeTeamIdState);
	const { user: authUser } = useAuthenticateUser();
	const { activeTeam } = useOrganizationTeams();
	const queryClient = useQueryClient();

	const [taskPriorities, setTaskPriorities] = useAtom(taskPrioritiesListState);
	const { firstLoadData: firstLoadTaskPrioritiesData } = useFirstLoad();

	const organizationId =
		authUser?.employee?.organizationId || user?.employee?.organizationId || getOrganizationIdCookie();
	const tenantId = authUser?.employee?.tenantId || user?.tenantId || getTenantIdCookie();
	const teamId = activeTeam?.id || getActiveTeamIdCookie() || activeTeamId;

	// useQuery for fetching task priorities
	const taskPrioritiesQuery = useQuery({
		queryKey: queryKeys.taskPriorities.byTeam(teamId || ''),
		queryFn: async () => {
			if (!tenantId || !organizationId) {
				return Promise.resolve({ items: [] });
			}

			const res = await taskPriorityService.getTaskPrioritiesList(tenantId, organizationId, teamId || null);

			setTaskPriorities(res.items);

			return res;
		}
	});

	// Mutations
	const createTaskPriorityMutation = useMutation({
		mutationFn: (data: ITaskPrioritiesCreate) => {
			if (!tenantId) {
				throw new Error('Required parameters missing: tenantId is required');
			}
			const requestData = { ...data, organizationTeamId: teamId || '' };
			return taskPriorityService.createTaskPriority(requestData, tenantId);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.taskPriorities.byTeam(teamId || '')
			});
		}
	});

	const updateTaskPriorityMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: ITaskPrioritiesCreate }) => {
			if (!tenantId) {
				throw new Error('Required parameters missing: tenantId is required');
			}
			return taskPriorityService.editTaskPriority(id, data, tenantId);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.taskPriorities.byTeam(teamId || '')
			});
		}
	});

	const deleteTaskPriorityMutation = useMutation({
		mutationFn: (id: string) => taskPriorityService.deleteTaskPriority(id),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.taskPriorities.byTeam(teamId || '')
			});
		}
	});

	const loadTaskPriorities = useCallback(async () => {
		return taskPrioritiesQuery.data;
	}, [taskPrioritiesQuery.data]);

	const handleFirstLoad = useCallback(async () => {
		await loadTaskPriorities();
		firstLoadTaskPrioritiesData();
	}, [firstLoadTaskPrioritiesData, loadTaskPriorities]);

	return {
		// useQuery-based methods (recommended)
		taskPriorities: taskPriorities,

		// Legacy methods (for backward compatibility)
		loading: taskPrioritiesQuery.isLoading,
		firstLoadTaskPrioritiesData: handleFirstLoad,
		createTaskPriorities: createTaskPriorityMutation.mutateAsync,
		createTaskPrioritiesLoading: createTaskPriorityMutation.isPending,
		deleteTaskPrioritiesLoading: deleteTaskPriorityMutation.isPending,
		deleteTaskPriorities: deleteTaskPriorityMutation.mutateAsync,
		editTaskPriorities: (id: string, data: ITaskPrioritiesCreate) =>
			updateTaskPriorityMutation.mutateAsync({ id, data }),
		editTaskPrioritiesLoading: updateTaskPriorityMutation.isPending,
		setTaskPriorities,
		loadTaskPriorities
	};
}
