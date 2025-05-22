'use client';

import { ITaskSizesCreate } from '@/core/types/interfaces/to-review';
import { activeTeamIdState } from '@/core/stores';
import { taskSizesListState } from '@/core/stores/tasks/task-sizes';
import { useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useFirstLoad } from '../common/use-first-load';
import { useQuery } from '../common/use-query';
import { taskSizeService } from '@/core/services/client/api/tasks/task-size.service';

export function useTaskSizes() {
	const activeTeamId = useAtomValue(activeTeamIdState);
	const [taskSizes, setTaskSizes] = useAtom(taskSizesListState);
	const { firstLoadData: firstLoadTaskSizesData } = useFirstLoad();

	const {
		loading: getTaskSizesLoading,
		queryCall: getTaskSizesQueryCall,
		loadingRef: getTaskSizesLoadingRef
	} = useQuery(taskSizeService.getTaskSizes);
	const { loading: createTaskSizeLoading, queryCall: createTaskSizeQueryCall } = useQuery(
		taskSizeService.createTaskSize
	);
	const { loading: deleteTaskSizeLoading, queryCall: deleteTaskSizeQueryCall } = useQuery(
		taskSizeService.deleteTaskSize
	);
	const { loading: editTaskSizeLoading, queryCall: editTaskSizeQueryCall } = useQuery(taskSizeService.editTaskSize);

	const loadTaskSizes = useCallback(async () => {
		try {
			if (getTaskSizesLoadingRef.current) {
				return;
			}

			const res = await getTaskSizesQueryCall();

			if (res?.data?.items) {
				setTaskSizes(res?.data?.items || []);
			}
		} catch (error) {
			console.error('Failed to load task sizes:', error);
		}
	}, [getTaskSizesLoadingRef, getTaskSizesQueryCall, setTaskSizes]);

	const createTaskSize = useCallback(
		async (data: ITaskSizesCreate) => {
			try {
				const res = await createTaskSizeQueryCall({ ...data, organizationTeamId: activeTeamId });

				return res.data;
			} catch (error) {
				console.error('Failed to create task size:', error);
			}
		},

		[createTaskSizeQueryCall, activeTeamId]
	);

	const deleteTaskSize = useCallback(
		async (id: string) => {
			try {
				const res = await deleteTaskSizeQueryCall(id);

				return res.data;
			} catch (error) {
				console.error('Failed to delete task size:', error);
			}
		},
		[deleteTaskSizeQueryCall]
	);

	const editTaskSize = useCallback(
		async (id: string, data: ITaskSizesCreate) => {
			try {
				const res = await editTaskSizeQueryCall(id, { ...data, organizationTeamId: activeTeamId });

				return res.data;
			} catch (error) {
				console.error('Failed to edit task size:', error);
			}
		},
		[editTaskSizeQueryCall, activeTeamId]
	);

	const handleFirstLoad = useCallback(async () => {
		await loadTaskSizes();

		firstLoadTaskSizesData();
	}, [firstLoadTaskSizesData, loadTaskSizes]);

	return {
		loading: getTaskSizesLoading,
		taskSizes,
		firstLoadTaskSizesData: handleFirstLoad,
		createTaskSize,
		deleteTaskSize,
		createTaskSizeLoading,
		deleteTaskSizeLoading,
		editTaskSizeLoading,
		editTaskSize,
		setTaskSizes,
		loadTaskSizes
	};
}
