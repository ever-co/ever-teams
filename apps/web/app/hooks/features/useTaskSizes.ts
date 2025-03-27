'use client';

import { ITaskSizesCreate } from '@app/interfaces';
import { createTaskSizeAPI, deleteTaskSizeAPI, getTaskSizes, editTaskSizeAPI } from '@app/services/client/api';
import { activeTeamIdState } from '@app/stores';
import { taskSizesListState } from '@app/stores/task-sizes';
import { useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useFirstLoad } from '../useFirstLoad';
import { useQuery } from '../useQuery';

export function useTaskSizes() {
	const activeTeamId = useAtomValue(activeTeamIdState);
	const [taskSizes, setTaskSizes] = useAtom(taskSizesListState);
	const { firstLoadData: firstLoadTaskSizesData } = useFirstLoad();

	const {
		loading: getTaskSizesLoading,
		queryCall: getTaskSizesQueryCall,
		loadingRef: getTaskSizesLoadingRef
	} = useQuery(getTaskSizes);
	const { loading: createTaskSizeLoading, queryCall: createTaskSizeQueryCall } = useQuery(createTaskSizeAPI);
	const { loading: deleteTaskSizeLoading, queryCall: deleteTaskSizeQueryCall } = useQuery(deleteTaskSizeAPI);
	const { loading: editTaskSizeLoading, queryCall: editTaskSizeQueryCall } = useQuery(editTaskSizeAPI);

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
