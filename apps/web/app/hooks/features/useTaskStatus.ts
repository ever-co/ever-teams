import { ITaskStatusCreate } from '@app/interfaces';
import {
	createTaskStatusAPI,
	getTaskStatusList,
	deleteTaskStatusAPI,
	editTaskStatusAPI
} from '@app/services/client/api';
import { userState, taskStatusFetchingState, taskStatusListState, activeTeamIdState } from '@app/stores';
import { useCallback, useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { useFirstLoad } from '../useFirstLoad';
import { useQuery } from '../useQuery';
import isEqual from 'lodash/isEqual';
import { getActiveTeamIdCookie } from '@app/helpers';

export function useTaskStatus() {
	const [user] = useRecoilState(userState);
	const activeTeamId = useRecoilValue(activeTeamIdState);

	const { loading, queryCall } = useQuery(getTaskStatusList);
	const { loading: createTaskStatusLoading, queryCall: createQueryCall } = useQuery(createTaskStatusAPI);
	const { loading: deleteTaskStatusLoading, queryCall: deleteQueryCall } = useQuery(deleteTaskStatusAPI);
	const { loading: editTaskStatusLoading, queryCall: editQueryCall } = useQuery(editTaskStatusAPI);

	const [taskStatus, setTaskStatus] = useRecoilState(taskStatusListState);
	const [taskStatusFetching, setTaskStatusFetching] = useRecoilState(taskStatusFetchingState);
	const { firstLoadData: firstLoadTaskStatusData, firstLoad } = useFirstLoad();

	useEffect(() => {
		if (firstLoad) {
			setTaskStatusFetching(loading);
		}
	}, [loading, firstLoad, setTaskStatusFetching]);

	const loadTaskStatusData = useCallback(() => {
		const teamId = getActiveTeamIdCookie();
		queryCall(
			user?.tenantId as string,
			user?.employee?.organizationId as string,
			activeTeamId || teamId || null
		).then((res) => {
			if (!isEqual(res?.data?.data?.items || [], taskStatus)) {
				setTaskStatus(res?.data?.data?.items || []);
			}
			return res;
		});
	}, [user, activeTeamId, setTaskStatus, taskStatus, queryCall]);

	useEffect(() => {
		if (!firstLoad) return;
		loadTaskStatusData();
	}, [loadTaskStatusData, firstLoad]);

	const createTaskStatus = useCallback(
		(data: ITaskStatusCreate) => {
			if (user?.tenantId) {
				return createQueryCall({ ...data, organizationTeamId: activeTeamId }, user?.tenantId || '').then(
					(res) => {
						return res;
					}
				);
			}
		},

		[createQueryCall, activeTeamId, user]
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
		[deleteQueryCall, user, activeTeamId, queryCall, setTaskStatus]
	);

	const editTaskStatus = useCallback(
		(id: string, data: ITaskStatusCreate) => {
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
		[user, activeTeamId, editQueryCall, queryCall, setTaskStatus]
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
		loadTaskStatusData
	};
}
