'use client';
import { taskPrioritiesListState, activeTeamIdState, activeTeamState } from '@/core/stores';
import { useCallback, useMemo } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFirstLoad } from '../common/use-first-load';
import { getActiveTeamIdCookie, getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/index';
import { taskPriorityService } from '@/core/services/client/api/tasks/task-priority.service';
import { ITaskPrioritiesCreate } from '@/core/types/interfaces/task/task-priority';
import { queryKeys } from '@/core/query/keys';
import { useConditionalUpdateEffect } from '../common';
import { useUserQuery } from '../queries/user-user.query';

export function useTaskPriorities() {
	const activeTeamId = useAtomValue(activeTeamIdState);
	const { data: authUser } = useUserQuery();
	const activeTeam = useAtomValue(activeTeamState);
	const queryClient = useQueryClient();

	const [taskPriorities, setTaskPriorities] = useAtom(taskPrioritiesListState);
	const { firstLoadData: firstLoadTaskPrioritiesData } = useFirstLoad();

	const organizationId = useMemo(() => authUser?.employee?.organizationId || getOrganizationIdCookie(), [authUser]);
	const tenantId = useMemo(() => authUser?.employee?.tenantId || getTenantIdCookie(), [authUser]);
	const teamId = useMemo(() => activeTeam?.id || getActiveTeamIdCookie() || activeTeamId, [activeTeam, activeTeamId]);
	const isEnabled = useMemo(() => !!tenantId && !!organizationId && !!teamId, [tenantId, organizationId, teamId]);
	// useQuery for fetching task priorities
	const taskPrioritiesQuery = useQuery({
		queryKey: queryKeys.taskPriorities.byTeam(teamId),
		queryFn: async () => {
			if (!isEnabled) {
				throw new Error('Required parameters missing: tenantId, organizationId, and teamId are required');
			}

			return await taskPriorityService.getTaskPrioritiesList();
		},
		enabled: isEnabled
	});

	const invalidateTaskPrioritiesData = useCallback(
		() => queryClient.invalidateQueries({ queryKey: queryKeys.taskPriorities.byTeam(teamId) }),
		[queryClient, teamId]
	);

	// Mutations
	const createTaskPriorityMutation = useMutation({
		mutationFn: (data: ITaskPrioritiesCreate) => {
			const isEnabled = !!tenantId && !!teamId;
			if (!isEnabled) {
				throw new Error('Required parameters missing: tenantId, teamId is required');
			}
			const requestData = { ...data, organizationTeamId: teamId };
			return taskPriorityService.createTaskPriority(requestData);
		},
		onSuccess: invalidateTaskPrioritiesData
	});

	const updateTaskPriorityMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: ITaskPrioritiesCreate }) => {
			const isEnabled = !!tenantId && !!teamId;
			if (!isEnabled) {
				throw new Error('Required parameters missing: tenantId, teamId is required');
			}
			return taskPriorityService.editTaskPriority({ taskPriorityId: id, data });
		},
		onSuccess: invalidateTaskPrioritiesData
	});

	const deleteTaskPriorityMutation = useMutation({
		mutationFn: (id: string) => taskPriorityService.deleteTaskPriority(id),
		onSuccess: invalidateTaskPrioritiesData
	});

	useConditionalUpdateEffect(
		() => {
			if (taskPrioritiesQuery.data) {
				setTaskPriorities(taskPrioritiesQuery.data.items);
			}
		},
		[taskPrioritiesQuery.data],
		Boolean(taskPriorities?.length)
	);

	const loadTaskPriorities = useCallback(async () => {
		return taskPrioritiesQuery.data;
	}, [taskPrioritiesQuery.data]);

	const handleFirstLoad = useCallback(async () => {
		await loadTaskPriorities();
		firstLoadTaskPrioritiesData();
	}, [firstLoadTaskPrioritiesData, loadTaskPriorities]);
	const editTaskPriorities = useCallback(
		(id: string, data: ITaskPrioritiesCreate) => updateTaskPriorityMutation.mutateAsync({ id, data }),
		[updateTaskPriorityMutation]
	);
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
		editTaskPriorities,
		editTaskPrioritiesLoading: updateTaskPriorityMutation.isPending,
		setTaskPriorities,
		loadTaskPriorities
	};
}
