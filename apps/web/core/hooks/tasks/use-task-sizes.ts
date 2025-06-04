'use client';

import { activeTeamIdState } from '@/core/stores';
import { taskSizesListState } from '@/core/stores/tasks/task-sizes';
import { useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFirstLoad } from '../common/use-first-load';
import { taskSizeService } from '@/core/services/client/api/tasks/task-size.service';
import { ITaskSizesCreate } from '@/core/types/interfaces/task/task-size';
import { queryKeys } from '@/core/query/keys';
import { useOrganizationTeams } from '../organizations';

export function useTaskSizes() {
	const activeTeamId = useAtomValue(activeTeamIdState);
	const [taskSizes, setTaskSizes] = useAtom(taskSizesListState);
	const { firstLoadData: firstLoadTaskSizesData } = useFirstLoad();
	const { activeTeam } = useOrganizationTeams();
	const queryClient = useQueryClient();

	const teamId = activeTeam?.id || activeTeamId;

	// useQuery for fetching task sizes
	const taskSizesQuery = useQuery({
		queryKey: queryKeys.taskSizes.byTeam(teamId),
		queryFn: async () => {
			const res = await taskSizeService.getTaskSizes();

			setTaskSizes(res.items);

			return res;
		}
	});

	// Mutations
	const createTaskSizeMutation = useMutation({
		mutationFn: (data: ITaskSizesCreate) => {
			const requestData = { ...data, organizationTeamId: teamId };
			return taskSizeService.createTaskSize(requestData);
		},
		onSuccess: () => {
			teamId &&
				queryClient.invalidateQueries({
					queryKey: queryKeys.taskSizes.byTeam(teamId)
				});
		}
	});

	const updateTaskSizeMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: ITaskSizesCreate }) => {
			const requestData = { ...data, organizationTeamId: teamId };
			return taskSizeService.editTaskSize(id, requestData);
		},
		onSuccess: () => {
			teamId &&
				queryClient.invalidateQueries({
					queryKey: queryKeys.taskSizes.byTeam(teamId)
				});
		}
	});

	const deleteTaskSizeMutation = useMutation({
		mutationFn: (id: string) => taskSizeService.deleteTaskSize(id),
		onSuccess: () => {
			teamId &&
				queryClient.invalidateQueries({
					queryKey: queryKeys.taskSizes.byTeam(teamId)
				});
		}
	});

	const loadTaskSizes = useCallback(async () => {
		try {
			const res = taskSizesQuery.data;

			if (res?.items) {
				setTaskSizes(res?.items || []);
			}
		} catch (error) {
			console.error('Failed to load task sizes:', error);
		}
	}, [setTaskSizes]);

	const handleFirstLoad = useCallback(async () => {
		await loadTaskSizes();

		firstLoadTaskSizesData();
	}, [firstLoadTaskSizesData, loadTaskSizes]);

	return {
		taskSizes,
		loading: taskSizesQuery.isLoading,
		firstLoadTaskSizesData: handleFirstLoad,
		createTaskSize: createTaskSizeMutation.mutateAsync,
		deleteTaskSize: deleteTaskSizeMutation.mutateAsync,
		createTaskSizeLoading: createTaskSizeMutation.isPending,
		deleteTaskSizeLoading: deleteTaskSizeMutation.isPending,
		editTaskSizeLoading: updateTaskSizeMutation.isPending,
		editTaskSize: (id: string, data: ITaskSizesCreate) => updateTaskSizeMutation.mutateAsync({ id, data }),
		setTaskSizes,
		loadTaskSizes
	};
}
