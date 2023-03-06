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
	activeTeamState,
} from '@app/stores';
import { useCallback, useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { useFirstLoad } from '../useFirstLoad';
import { useQuery } from '../useQuery';

export function useTaskStatus() {
	const [user] = useRecoilState(userState);
	const activeTeam = useRecoilValue(activeTeamState);

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
	const { firstLoadData: firstLoadTaskStatusData } = useFirstLoad();

	useEffect(() => {
		setTaskStatusFetching(loading);
	}, [loading, setTaskStatusFetching]);

	useEffect(() => {
		queryCall(
			user?.tenantId as string,
			user?.employee?.organizationId as string,
			activeTeam?.id || null
		).then((res) => {
			setTaskStatus(res?.data?.data?.items || []);
			return res;
		});
	}, [activeTeam]);

	const createTaskStatus = useCallback(
		(data: ITaskStatusCreate) => {
			if (user?.tenantId) {
				return createQueryCall(
					{ ...data, organizationTeamId: activeTeam?.id },
					user?.tenantId || ''
				).then((res) => {
					if (res?.data?.data && res?.data?.data?.name) {
						queryCall(
							user?.tenantId as string,
							user?.employee?.organizationId as string,
							activeTeam?.id || null
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
			activeTeam,
		]
	);

	const deleteTaskStatus = useCallback(
		(id: string) => {
			if (user?.tenantId) {
				return deleteQueryCall(id).then((res) => {
					queryCall(
						user?.tenantId as string,
						user?.employee?.organizationId as string,
						activeTeam?.id || null
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
			activeTeam,
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
						activeTeam?.id || null
					).then((res) => {
						setTaskStatus(res?.data?.data?.items || []);
						return res;
					});
					return res;
				});
			}
		},
		[editTaskStatusLoading, user, activeTeam]
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
		editTaskStatusLoading,
		editTaskStatus,
	};
}
