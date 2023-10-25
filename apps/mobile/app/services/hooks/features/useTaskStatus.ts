import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from 'react-query';
import { useStores } from '../../../models';
import useFetchAllStatuses from '../../client/queries/task/task-status';
import {
	createStatusRequest,
	deleteTaskStatusRequest,
	updateTaskStatusRequest
} from '../../client/requests/task-status';
import { ITaskStatusCreate, ITaskStatusItem } from '../../interfaces/ITaskStatus';

export function useTaskStatus() {
	const queryClient = useQueryClient();
	const {
		authenticationStore: { authToken, tenantId, organizationId },
		teamStore: { activeTeamId }
	} = useStores();

	const [allStatuses, setAllStatuses] = useState<ITaskStatusItem[]>([]);

	const {
		data: statuses,
		isLoading,
		isSuccess,
		isRefetching
	} = useFetchAllStatuses({ tenantId, organizationId, activeTeamId, authToken });

	// Delete the status
	const deleteStatus = useCallback(async (id: string) => {
		await deleteTaskStatusRequest({
			id,
			tenantId,
			bearer_token: authToken
		});
		queryClient.invalidateQueries('statuses');
	}, []);

	// Update the status

	const updateStatus = useCallback(async (id: string, data: ITaskStatusCreate) => {
		await updateTaskStatusRequest({
			id,
			tenantId,
			datas: data,
			bearer_token: authToken
		});
		queryClient.invalidateQueries('statuses');
	}, []);

	// Create the status

	const createStatus = useCallback(async (data: ITaskStatusCreate) => {
		await createStatusRequest({
			tenantId,
			datas: { ...data, organizationId, organizationTeamId: activeTeamId },
			bearer_token: authToken
		});
		queryClient.invalidateQueries('statuses');
	}, []);

	useEffect(() => {
		if (isSuccess) {
			if (statuses) {
				setAllStatuses(statuses.items || []);
			}
		}
	}, [isLoading, isRefetching]);

	return {
		statuses,
		isLoading,
		deleteStatus,
		updateStatus,
		allStatuses,
		createStatus
	};
}
