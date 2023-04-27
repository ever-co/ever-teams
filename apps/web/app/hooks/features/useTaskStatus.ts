import { ITaskStatusCreate } from '@app/interfaces';
import {
	createTaskStatusAPI,
	getTaskstatusList,
	deleteTaskStatusAPI,
	editTaskStatusAPI,
} from '@app/services/client/api';
import {
	userState,
	taskStatusFetchingState,
	taskStatusListState,
	activeTeamIdState,
} from '@app/stores';
import { useCallback, useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { useFirstLoad } from '../useFirstLoad';
import { useQuery } from '../useQuery';
import isEqual from 'lodash/isEqual';

export function useTaskStatus() {
	const [user] = useRecoilState(userState);
	const activeTeamId = useRecoilValue(activeTeamIdState);

	const { loading, queryCall } = useQuery(getTaskstatusList);
	const { loading: createTaskStatusLoading, queryCall: createQueryCall } =
		useQuery(createTaskStatusAPI);
	const { loading: deleteTaskStatusLoading, queryCall: deleteQueryCall } =
		useQuery(deleteTaskStatusAPI);
	const { loading: editTaskStatusLoading, queryCall: editQueryCall } =
		useQuery(editTaskStatusAPI);

	const [taskStatus, setTaskStatus] = useRecoilState(taskStatusListState);
	const [taskStatusFetching, setTaskStatusFetching] = useRecoilState(
		taskStatusFetchingState
	);
	const { firstLoadData: firstLoadTaskStatusData, firstLoad } = useFirstLoad();

	useEffect(() => {
		if (firstLoad) {
			setTaskStatusFetching(loading);
		}
	}, [loading, firstLoad, setTaskStatusFetching]);

	const loadTaskStatusData = useCallback(() => {
		queryCall(
			user?.tenantId as string,
			user?.employee?.organizationId as string,
			activeTeamId || null
		).then((res) => {
			if (!isEqual(res?.data?.data?.items || [], taskStatus)) {
				setTaskStatus(res?.data?.data?.items || []);
			}
			return res;
		});
	}, [user, activeTeamId, setTaskStatus]);

	useEffect(() => {
		if (!firstLoad) return;
		loadTaskStatusData();
	}, [activeTeamId, firstLoad]);

	const createTaskStatus = useCallback(
		(data: ITaskStatusCreate) => {
			if (user?.tenantId) {
				return createQueryCall(
					{ ...data, organizationTeamId: activeTeamId },
					user?.tenantId || ''
				).then((res) => {
					if (res?.data?.data && res?.data?.data?.name) {
						queryCall(
							user?.tenantId as string,
							user?.employee?.organizationId as string,
							activeTeamId || null
						).then((res) => {
							setTaskStatus(res?.data?.data?.items || []);
							return res;
						});
					}

					return res;
				});
			}
		},

		[
			createQueryCall,
			createTaskStatusLoading,
			deleteTaskStatusLoading,
			activeTeamId,
		]
	);

	const deleteTaskStatus = useCallback(
		(id: string) => {
			if (user?.tenantId) {
				return deleteQueryCall(id).then((res) => {
					queryCall(
						user?.tenantId as string,
						user?.employee?.organizationId as string,
						activeTeamId || null
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
			user,
			activeTeamId,
		]
	);

	const editTaskStatus = useCallback(
		(id: string, data: ITaskStatusCreate) => {
			console.log(user);

			if (user?.tenantId) {
				return editQueryCall(id, data, user?.tenantId || '').then((res) => {
					queryCall(
						user?.tenantId as string,
						user?.employee?.organizationId as string,
						activeTeamId || null
					).then((res) => {
						setTaskStatus(res?.data?.data?.items || []);
						return res;
					});
					return res;
				});
			}
		},
		[editTaskStatusLoading, user, activeTeamId]
	);

	return {
		loading: taskStatusFetching,
		taskStatus,
		taskStatusFetching,
		firstLoadTaskStatusData,
		createTaskStatus,
		createTaskStatusLoading,
		deleteTaskStatusLoading,
		deleteTaskStatus,
		editTaskStatusLoading,
		editTaskStatus,
		setTaskStatus,
		loadTaskStatusData,
	};
}
