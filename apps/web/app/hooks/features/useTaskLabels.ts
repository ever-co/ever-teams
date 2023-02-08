import { ITaskLabelsCreate } from '@app/interfaces';
import {
	getTaskLabelsList,
	deleteTaskLabelsAPI,
	createTaskLabelsAPI,
	editTaskLabelsAPI,
} from '@app/services/client/api';
import {
	userState,
	taskLabelsListState,
	taskLabelsFetchingState,
} from '@app/stores';
import { useCallback, useEffect } from 'react';
import { useRecoilState } from 'recoil';
import { useFirstLoad } from '../useFirstLoad';
import { useQuery } from '../useQuery';

export function useTaskLabels() {
	const [user] = useRecoilState(userState);

	const { loading, queryCall } = useQuery(getTaskLabelsList);
	const { loading: createTaskLabelsLoading, queryCall: createQueryCall } =
		useQuery(createTaskLabelsAPI);
	const { loading: deleteTaskLabelsLoading, queryCall: deleteQueryCall } =
		useQuery(deleteTaskLabelsAPI);
	const { loading: editTaskLabelsLoading, queryCall: editQueryCall } =
		useQuery(editTaskLabelsAPI);

	const [taskLabels, setTaskLabels] = useRecoilState(taskLabelsListState);

	const [taskLabelsFetching, setTaskLabelsFetching] = useRecoilState(
		taskLabelsFetchingState
	);
	const { firstLoadData: firstLoadTaskLabelsData } = useFirstLoad();

	useEffect(() => {
		setTaskLabelsFetching(loading);
	}, [loading, setTaskLabelsFetching]);

	useEffect(() => {
		queryCall(
			user?.tenantId as string,
			user?.employee?.organizationId as string
		).then((res) => {
			setTaskLabels(res?.data?.data?.items || []);
			return res;
		});
	}, []);

	const createTaskLabels = useCallback(
		(data: ITaskLabelsCreate) => {
			if (user?.tenantId) {
				return createQueryCall(data, user?.tenantId || '').then((res) => {
					if (res?.data?.data && res?.data?.data?.name) {
						queryCall(
							user?.tenantId as string,
							user?.employee?.organizationId as string
						).then((res) => {
							setTaskLabels(res?.data?.data?.items || []);
							return res;
						});
					}

					return res;
				});
			}
		},

		[createQueryCall, createTaskLabelsLoading, deleteTaskLabelsLoading, user]
	);

	const deleteTaskLabels = useCallback(
		(id: string) => {
			if (user?.tenantId) {
				return deleteQueryCall(id, user?.tenantId || '').then((res) => {
					queryCall(
						user?.tenantId as string,
						user?.employee?.organizationId as string
					).then((res) => {
						setTaskLabels(res?.data?.data?.items || []);
						return res;
					});
					return res;
				});
			}
		},
		[
			deleteQueryCall,
			taskLabels.length,
			createTaskLabelsLoading,
			deleteTaskLabelsLoading,
			user,
		]
	);

	const editTaskLabels = useCallback(
		(id: string, data: ITaskLabelsCreate) => {
			if (user?.tenantId) {
				return editQueryCall(id, data, user?.tenantId || '').then((res) => {
					queryCall(
						user?.tenantId as string,
						user?.employee?.organizationId as string
					).then((res) => {
						setTaskLabels(res?.data?.data?.items || []);
						return res;
					});
					return res;
				});
			}
		},
		[editTaskLabelsLoading, user]
	);

	return {
		// loadTaskStatus,
		loading,
		taskLabels,
		taskLabelsFetching,
		firstLoadTaskLabelsData,
		createTaskLabels,
		createTaskLabelsLoading,
		deleteTaskLabelsLoading,
		deleteTaskLabels,
		editTaskLabels,
		editTaskLabelsLoading,
	};
}
