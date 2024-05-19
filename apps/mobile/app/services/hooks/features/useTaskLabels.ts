import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useStores } from '../../../models';
import useFetchAllLabels from '../../client/queries/task/task-labels';
import { createLabelRequest, deleteTaskLabelRequest, updateTaskLabelsRequest } from '../../client/requests/task-label';
import { ITaskLabelItem } from '../../interfaces/ITaskLabel';
import { ITaskStatusCreate } from '../../interfaces/ITaskStatus';

export function useTaskLabels() {
	const queryClient = useQueryClient();
	const {
		authenticationStore: { authToken, tenantId, organizationId },
		teamStore: { activeTeamId }
	} = useStores();

	const [allTaskLabels, setAllTaskLabels] = useState<ITaskLabelItem[]>([]);
	const {
		data: labels,
		isLoading,
		isSuccess,
		isRefetching
	} = useFetchAllLabels({ tenantId, organizationId, authToken });

	// Delete the label
	const deleteLabel = useCallback(async (id: string) => {
		await deleteTaskLabelRequest({
			id,
			tenantId,
			bearer_token: authToken
		});
		queryClient.invalidateQueries({ queryKey: ['labels'] });
	}, []);

	// Update the label
	const updateLabel = useCallback(async (id: string, data: ITaskStatusCreate) => {
		await updateTaskLabelsRequest({
			id,
			tenantId,
			datas: data,
			bearer_token: authToken
		});
		queryClient.invalidateQueries({ queryKey: ['labels'] });
	}, []);

	// Create the label
	const createLabel = useCallback(async (data: ITaskStatusCreate) => {
		await createLabelRequest({
			tenantId,
			datas: { ...data, organizationId, organizationTeamId: activeTeamId },
			bearer_token: authToken
		});
		queryClient.invalidateQueries({ queryKey: ['labels'] });
	}, []);

	useEffect(() => {
		if (isSuccess) {
			if (labels) {
				setAllTaskLabels(labels.items || []);
			}
		}
	}, [isLoading, isRefetching]);

	return {
		labels,
		isLoading,
		deleteLabel,
		updateLabel,
		createLabel,
		allTaskLabels
	};
}
