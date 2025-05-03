'use client';

import { ITaskStatusCreate, ITaskStatusOrder } from '@/core/types/interfaces';
import {
	createTaskStatusAPI,
	getTaskStatusesAPI,
	deleteTaskStatusAPI,
	editTaskStatusAPI,
	editTaskStatusOrderAPI
} from '@/core/services/client/api';
import { taskStatusesState, activeTeamIdState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useFirstLoad } from '../useFirstLoad';
import { useQuery } from '../useQuery';
import { getActiveTeamIdCookie, getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/index';

export function useTaskStatus() {
	const activeTeamId = useAtomValue(activeTeamIdState);
	const [taskStatuses, setTaskStatuses] = useAtom(taskStatusesState);
	const { firstLoadData: firstLoadTaskStatusesData } = useFirstLoad();
	const teamId = getActiveTeamIdCookie() || activeTeamId;
	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();

	const {
		loading: getTaskStatusesLoading,
		queryCall: getTaskStatusesQueryCall,
		loadingRef: getTaskStatusesLoadingRef
	} = useQuery(getTaskStatusesAPI);
	const { loading: createTaskStatusLoading, queryCall: createQueryCall } = useQuery(createTaskStatusAPI);
	const { loading: deleteTaskStatusLoading, queryCall: deleteQueryCall } = useQuery(deleteTaskStatusAPI);
	const { loading: editTaskStatusLoading, queryCall: editQueryCall } = useQuery(editTaskStatusAPI);
	const { loading: reOrderTaskStatusLoading, queryCall: reOrderQueryCall } = useQuery(editTaskStatusOrderAPI);

	const getTaskStatuses = useCallback(async () => {
		try {
			if (getTaskStatusesLoadingRef.current) {
				return;
			}
			if (organizationId && teamId && tenantId) {
				const res = await getTaskStatusesQueryCall(tenantId, organizationId, teamId);

				return res;
			} else {
				throw Error(
					'Required parameters missing: organizationId and teamId are required. Ensure you have tenant,  active team and organization ids set in cookies.'
				);
			}
		} catch (error) {
			console.error('Failed to get task statuses:', error);
		}
	}, [getTaskStatusesLoadingRef, getTaskStatusesQueryCall, organizationId, teamId, tenantId]);

	const createTaskStatus = useCallback(
		async (data: ITaskStatusCreate) => {
			try {
				if (tenantId) {
					const requestData = { ...data, organizationTeamId: activeTeamId };

					const res = await createQueryCall(requestData, tenantId);

					return res;
				} else {
					throw Error(
						'Required parameters missing: tenantId is required. Ensure you have tenant id set in cookies.'
					);
				}
			} catch (error) {
				console.error('[WEB][useTaskStatus] Failed to create task status:', error);
				throw error;
			}
		},
		[tenantId, createQueryCall, activeTeamId]
	);

	const deleteTaskStatus = useCallback(
		async (id: string) => {
			try {
				if (tenantId) {
					const res = await deleteQueryCall(id);

					return res;
				} else {
					throw Error(
						'Required parameters missing: tenantId is required. Ensure you have tenant id set in cookies.'
					);
				}
			} catch (error) {
				console.error('Failed to delete task status:', error);
			}
		},
		[tenantId, deleteQueryCall]
	);

	const editTaskStatus = useCallback(
		async (id: string, data: ITaskStatusCreate) => {
			try {
				if (tenantId) {
					const res = await editQueryCall(id, data, tenantId);

					return res;
				} else {
					throw Error(
						'Required parameters missing: tenantId is required. Ensure you have tenant id set in cookies.'
					);
				}
			} catch (error) {
				console.error('Failed to edit task status:', error);
			}
		},
		[tenantId, editQueryCall]
	);

	const reOrderTaskStatus = useCallback(
		async (data: ITaskStatusOrder) => {
			try {
				if (tenantId) {
					const res = await reOrderQueryCall(data, tenantId);

					return res;
				} else {
					throw Error(
						'Required parameters missing: tenantId is required. Ensure you have tenant id set in cookies.'
					);
				}
			} catch (error) {
				console.error('Failed to re-order task status:', error);
			}
		},
		[reOrderQueryCall, tenantId]
	);

	const loadTaskStatuses = useCallback(async () => {
		try {
			const res = await getTaskStatuses();

			if (res) {
				setTaskStatuses(res.data.items);
			}
		} catch (error) {
			console.error('Failed to load task statuses:', error);
		}
	}, [getTaskStatuses, setTaskStatuses]);

	const handleFirstLoad = useCallback(() => {
		loadTaskStatuses();
		firstLoadTaskStatusesData();
	}, [firstLoadTaskStatusesData, loadTaskStatuses]);

	return {
		getTaskStatuses,
		getTaskStatusesLoading,
		createTaskStatus,
		createTaskStatusLoading,
		deleteTaskStatus,
		deleteTaskStatusLoading,
		editTaskStatus,
		editTaskStatusLoading,
		reOrderTaskStatus,
		reOrderTaskStatusLoading,
		taskStatuses,
		setTaskStatuses,
		firstLoadTaskStatusesData: handleFirstLoad,
		loadTaskStatuses
	};
}
