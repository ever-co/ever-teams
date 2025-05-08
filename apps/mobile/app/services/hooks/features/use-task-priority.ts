import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useStores } from '../../../models';
import useFetchAllPriorities from '../../client/queries/task/task-priority';
import {
	createPriorityRequest,
	deleteTaskPriorityRequest,
	updateTaskPriorityRequest
} from '../../client/requests/task-priority';
import { ITaskPriorityCreate, ITaskPriorityItem } from '../../interfaces/ITaskPriority';

export const useTaskPriority = () => {
	const queryClient = useQueryClient();
	const {
		authenticationStore: { authToken, tenantId, organizationId },
		teamStore: { activeTeamId }
	} = useStores();

	const [allTaskPriorities, setAllTaskPriorities] = useState<ITaskPriorityItem[]>([]);

	const {
		data: priorities,
		isLoading,
		isSuccess,
		isRefetching
	} = useFetchAllPriorities({
		tenantId,
		organizationId,
		activeTeamId,
		authToken
	});

	// Delete the priority
	const deletePriority = useCallback(async (id: string) => {
		await deleteTaskPriorityRequest({
			id,
			tenantId,
			bearer_token: authToken
		});
		queryClient.invalidateQueries({ queryKey: ['priorities'] });
	}, []);

	// Update the priority

	const updatePriority = useCallback(async (id: string, data: ITaskPriorityCreate) => {
		await updateTaskPriorityRequest({
			id,
			tenantId,
			datas: data,
			bearer_token: authToken
		});
		queryClient.invalidateQueries({ queryKey: ['priorities'] });
	}, []);

	// Create the priority

	const createPriority = useCallback(async (data: ITaskPriorityCreate) => {
		await createPriorityRequest({
			tenantId,
			datas: { ...data, organizationId, organizationTeamId: activeTeamId },
			bearer_token: authToken
		});
		queryClient.invalidateQueries({ queryKey: ['priorities'] });
	}, []);

	useEffect(() => {
		if (isSuccess) {
			if (priorities) {
				setAllTaskPriorities(priorities.items || []);
			}
		}
	}, [isLoading, isRefetching]);

	return {
		priorities,
		isLoading,
		deletePriority,
		updatePriority,
		createPriority,
		allTaskPriorities
	};
};
