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
	activeTeamIdState,
} from '@app/stores';
import { useCallback, useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { useFirstLoad } from '../useFirstLoad';
import { useQuery } from '../useQuery';
import isEqual from 'lodash/isEqual';

export function useTaskLabels() {
	const [user] = useRecoilState(userState);
	const activeTeamId = useRecoilValue(activeTeamIdState);

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
	const { firstLoadData: firstLoadTaskLabelsData, firstLoad } = useFirstLoad();

	useEffect(() => {
		if (firstLoad) {
			setTaskLabelsFetching(loading);
		}
	}, [loading, firstLoad, setTaskLabelsFetching]);

	const loadTaskLabels = useCallback(() => {
		queryCall(
			user?.tenantId as string,
			user?.employee?.organizationId as string,
			activeTeamId || null
		).then((res) => {
			if (!isEqual(res?.data?.data?.items || [], taskLabels)) {
				setTaskLabels(res?.data?.data?.items || []);
			}

			return res;
		});
	}, [user, activeTeamId, setTaskLabels]);

	useEffect(() => {
		if (!firstLoad) return;

		loadTaskLabels();
	}, [activeTeamId, firstLoad]);

	const createTaskLabels = useCallback(
		(data: ITaskLabelsCreate) => {
			if (user?.tenantId) {
				return createQueryCall(
					{
						...data,
						organizationTeamId: activeTeamId as string,
					},
					user?.tenantId || ''
				).then((res) => {
					if (res?.data?.data && res?.data?.data?.name) {
						queryCall(
							user?.tenantId as string,
							user?.employee?.organizationId as string,
							activeTeamId || null
						).then((res) => {
							setTaskLabels(res?.data?.data?.items || []);
							return res;
						});
					}

					return res;
				});
			}
		},

		[
			createQueryCall,
			createTaskLabelsLoading,
			deleteTaskLabelsLoading,
			user,
			activeTeamId,
		]
	);

	const deleteTaskLabels = useCallback(
		(id: string) => {
			if (user?.tenantId) {
				return deleteQueryCall(id).then((res) => {
					queryCall(
						user?.tenantId as string,
						user?.employee?.organizationId as string,
						activeTeamId || null
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
						user?.employee?.organizationId as string,
						activeTeamId || null
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
		loading: taskLabelsFetching,
		taskLabels,
		taskLabelsFetching,
		firstLoadTaskLabelsData,
		createTaskLabels,
		createTaskLabelsLoading,
		deleteTaskLabelsLoading,
		deleteTaskLabels,
		editTaskLabels,
		editTaskLabelsLoading,
		setTaskLabels,
		loadTaskLabels,
	};
}
