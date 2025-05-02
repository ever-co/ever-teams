import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
		isRefetching,
		refetch
	} = useFetchAllStatuses({ tenantId, organizationId, activeTeamId, authToken });

	console.log('[useTaskStatus] Query state:', {
		isLoading,
		isSuccess,
		isRefetching,
		hasData: !!statuses,
		statusesCount: statuses?.total || 0,
		itemsCount: statuses?.items?.length || 0
	});

	// Delete the status
	const deleteStatus = useCallback(async (id: string) => {
		await deleteTaskStatusRequest({
			id,
			tenantId,
			bearer_token: authToken
		});
		queryClient.invalidateQueries({ queryKey: ['statuses'] });
	}, []);

	// Update the status

	const updateStatus = useCallback(async (id: string, data: ITaskStatusCreate) => {
		await updateTaskStatusRequest({
			id,
			tenantId,
			datas: data,
			bearer_token: authToken
		});
		queryClient.invalidateQueries({ queryKey: ['statuses'] });
	}, []);

	// Create the status

	const createStatus = useCallback(
		async (data: ITaskStatusCreate) => {
			console.log('[useTaskStatus] Creating status with data:', {
				dataKeys: Object.keys(data),
				name: data?.name,
				color: data?.color,
				icon: data?.icon
			});

			if (!data || !tenantId || !organizationId || !activeTeamId) {
				console.error('[useTaskStatus] Create failed - Missing required data');
				return null;
			}

			try {
				// Create the request data, matching the web structure
				const requestData = {
					...data,
					organizationTeamId: activeTeamId
				};

				console.log('[useTaskStatus] Full request data:', requestData);

				// Call createStatusRequest directly with params like web version
				const response = await createStatusRequest(requestData, authToken, tenantId);

				console.log('[useTaskStatus] Create successful:', {
					status: response.response.status,
					id: response.data?.id,
					name: response.data?.name
				});

				queryClient.invalidateQueries({ queryKey: ['statuses'] });
				refetch();
				return response;
			} catch (error) {
				console.error('[useTaskStatus] Create error:', error);
				throw error;
			}
		},
		[authToken, tenantId, organizationId, activeTeamId, queryClient, refetch]
	);
	return {
		statuses,
		isLoading,
		deleteStatus,
		updateStatus,
		allStatuses,
		createStatus
	};
}
