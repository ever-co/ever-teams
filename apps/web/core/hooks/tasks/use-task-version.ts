'use client';

/* eslint-disable react-hooks/exhaustive-deps */
import { taskVersionsState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFirstLoad } from '../common/use-first-load';
import { getActiveTeamIdCookie } from '@/core/lib/helpers/index';
import { taskVersionService } from '@/core/services/client/api/tasks/task-version.service';
import { queryKeys } from '@/core/query/keys';
import { useConditionalUpdateEffect } from '../common';
import { TTaskVersionCreate, TTaskVersionUpdate } from '@/core/types/schemas';

export function useTaskVersion() {
	const activeTeamId = getActiveTeamIdCookie();
	const queryClient = useQueryClient();

	const [taskVersions, setTaskVersions] = useAtom(taskVersionsState);
	const { firstLoadData: firstLoadTaskVersionData } = useFirstLoad();

	// useQuery for fetching task versions
	const taskVersionsQuery = useQuery({
		queryKey: queryKeys.taskVersions.byTeam(activeTeamId),
		queryFn: async () => {
			try {
				return taskVersionService.getTaskVersions();
			} catch (error) {
				console.error('Error fetching task versions:', error);
			}
		}
	});

	/**
	 * Mutations
	 */

	const createTaskVersionMutation = useMutation({
		mutationFn: (data: TTaskVersionCreate) => {
			return taskVersionService.createTaskVersion(data);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.taskVersions.byTeam(activeTeamId)
			});
		},
		onError: (error) => {
			console.error('Error creating task version:', error);
		}
	});

	const deleteTaskVersionMutation = useMutation({
		mutationFn: (id: string) => {
			return taskVersionService.deleteTaskVersion(id);
		},
		onSuccess: () => {
			console.log('Task version deleted successfully');
			queryClient.invalidateQueries({
				queryKey: queryKeys.taskVersions.byTeam(activeTeamId)
			});
		},
		onError: (error) => {
			console.error('Error deleting task version:', error);
		}
	});

	const editTaskVersionMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: TTaskVersionUpdate }) => {
			return taskVersionService.updateTaskVersion(id, data);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.taskVersions.byTeam(activeTeamId)
			});
		},
		onError: (error) => {
			console.error('Error editing task version:', error);
		}
	});

	useConditionalUpdateEffect(
		() => {
			if (taskVersionsQuery.data) {
				setTaskVersions(taskVersionsQuery.data.items);
			}
		},
		[taskVersionsQuery.data],
		Boolean(taskVersions?.length)
	);

	const loadTaskVersionData = useCallback(() => {
		return taskVersionsQuery.data;
	}, [taskVersionsQuery.data]);

	return {
		loading: taskVersionsQuery.isLoading,
		taskVersions,
		taskVersionFetching: taskVersionsQuery.isPending,
		firstLoadTaskVersionData,
		createTaskVersion: createTaskVersionMutation.mutateAsync,
		createTaskVersionLoading: createTaskVersionMutation.isPending,
		deleteTaskVersionLoading: deleteTaskVersionMutation.isPending,
		deleteTaskVersion: deleteTaskVersionMutation.mutateAsync,
		editTaskVersionLoading: editTaskVersionMutation.isPending,
		editTaskVersion: (id: string, data: TTaskVersionUpdate) => editTaskVersionMutation.mutateAsync({ id, data }),
		setTaskVersion: setTaskVersions,
		loadTaskVersionData
	};
}
