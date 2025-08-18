'use client';
import { activeTeamIdState, activeTeamState } from '@/core/stores';
import { taskSizesListState } from '@/core/stores/tasks/task-sizes';
import { useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFirstLoad } from '../common/use-first-load';
import { taskSizeService } from '@/core/services/client/api/tasks/task-size.service';
import { ITaskSizesCreate } from '@/core/types/interfaces/task/task-size';
import { queryKeys } from '@/core/query/keys';
import { useConditionalUpdateEffect } from '../common';

export function useTaskSizes() {
	const activeTeamId = useAtomValue(activeTeamIdState);
	const [taskSizes, setTaskSizes] = useAtom(taskSizesListState);
	const { firstLoadData: firstLoadTaskSizesData } = useFirstLoad();

	const activeTeam = useAtomValue(activeTeamState);
	const queryClient = useQueryClient();

	const teamId = activeTeam?.id || activeTeamId;

	// useQuery for fetching task sizes
	const taskSizesQuery = useQuery({
		queryKey: queryKeys.taskSizes.byTeam(teamId),
		queryFn: async () => {
			const res = await taskSizeService.getTaskSizes();
			return res;
		}
	});
	const invalidateTaskSizesData = useCallback(
		() => teamId && queryClient.invalidateQueries({ queryKey: queryKeys.taskSizes.byTeam(teamId) }),
		[queryClient, teamId]
	);
	// Mutations
	const createTaskSizeMutation = useMutation({
		mutationFn: (data: ITaskSizesCreate) => {
			const requestData = { ...data, organizationTeamId: teamId };
			return taskSizeService.createTaskSize(requestData);
		},
		onSuccess: invalidateTaskSizesData
	});

	const updateTaskSizeMutation = useMutation({
		mutationFn: ({ taskSizeId, data }: { taskSizeId: string; data: ITaskSizesCreate }) => {
			const requestData = { ...data, organizationTeamId: teamId };
			return taskSizeService.editTaskSize({ taskSizeId, data: requestData });
		},
		onSuccess: invalidateTaskSizesData
	});

	const deleteTaskSizeMutation = useMutation({
		mutationFn: (id: string) => taskSizeService.deleteTaskSize(id),
		onSuccess: invalidateTaskSizesData
	});

	useConditionalUpdateEffect(
		() => {
			if (taskSizesQuery.data) {
				setTaskSizes(taskSizesQuery.data.items);
			}
		},
		[taskSizesQuery.data],
		Boolean(taskSizes?.length)
	);

	const loadTaskSizes = useCallback(async () => {
		return taskSizesQuery.data;
	}, [taskSizesQuery.data]);

	const handleFirstLoad = useCallback(async () => {
		await loadTaskSizes();

		firstLoadTaskSizesData();
	}, [firstLoadTaskSizesData, loadTaskSizes]);
	const editTaskSize = useCallback(
		(id: string, data: ITaskSizesCreate) => updateTaskSizeMutation.mutateAsync({ taskSizeId: id, data }),
		[updateTaskSizeMutation]
	);
	return {
		taskSizes,
		loading: taskSizesQuery.isLoading,
		firstLoadTaskSizesData: handleFirstLoad,
		createTaskSize: createTaskSizeMutation.mutateAsync,
		deleteTaskSize: deleteTaskSizeMutation.mutateAsync,
		createTaskSizeLoading: createTaskSizeMutation.isPending,
		deleteTaskSizeLoading: deleteTaskSizeMutation.isPending,
		editTaskSizeLoading: updateTaskSizeMutation.isPending,
		editTaskSize,
		setTaskSizes,
		loadTaskSizes
	};
}
