import { ITaskStatusCreate } from '@app/interfaces';
import {
	createTaskStatusAPI,
	getTaskstatusList,
	deleteTaskStatusAPI,
} from '@app/services/client/api';
import {
	userState,
	taskStatusFetchingState,
	taskStatusListState,
} from '@app/stores';
import { useCallback, useEffect } from 'react';
import { useRecoilState } from 'recoil';
import { useFirstLoad } from '../useFirstLoad';
import { useQuery } from '../useQuery';

export function useTaskStatus() {
	const [user] = useRecoilState(userState);

	const { loading, queryCall } = useQuery(getTaskstatusList);
	const { loading: createTaskStatusLoading, queryCall: createQueryCall } =
		useQuery(createTaskStatusAPI);
	const { loading: deleteTaskStatusLoading, queryCall: deleteQueryCall } =
		useQuery(deleteTaskStatusAPI);
	const [taskStatus, setTaskStatus] = useRecoilState(taskStatusListState);
	const [taskStatusFetching, setTaskStatusFetching] = useRecoilState(
		taskStatusFetchingState
	);
	const { firstLoadData: firstLoadTaskStatusData } = useFirstLoad();

	useEffect(() => {
		setTaskStatusFetching(loading);
	}, [loading, setTaskStatusFetching]);

	useEffect(() => {
		queryCall(
			user?.tenantId as string,
			user?.employee?.organizationId as string
		).then((res) => {
			setTaskStatus(res?.data?.data?.items || []);
			return res;
		});
	}, []);

	const createTaskStatus = useCallback(
		(data: ITaskStatusCreate) => {
			if (user?.tenantId) {
				return createQueryCall(data, user?.tenantId || '').then((res) => {
					if (res?.data?.data && res?.data?.data?.name) {
						queryCall(
							user?.tenantId as string,
							user?.employee?.organizationId as string
						).then((res) => {
							setTaskStatus(res?.data?.data?.items || []);
							return res;
						});
					}

					return res;
				});
			}
		},

		[createQueryCall, createTaskStatusLoading, deleteTaskStatusLoading]
	);

	const deleteTaskStatus = useCallback(
		(id: string) => {
			if (user?.tenantId) {
				return deleteQueryCall(id, user?.tenantId || '').then((res) => {
					queryCall(
						user?.tenantId as string,
						user?.employee?.organizationId as string
					).then((res) => {
						setTaskStatus(res?.data?.data?.items || []);
						return res;
					});
					return res;
				});
			}
		},
		[
			deleteQueryCall,
			taskStatus.length,
			createTaskStatusLoading,
			deleteTaskStatusLoading,
		]
	);

	return {
		loading,
		taskStatus,
		taskStatusFetching,
		firstLoadTaskStatusData,
		createTaskStatus,
		createTaskStatusLoading,
		deleteTaskStatusLoading,
		deleteTaskStatus,
	};
}
