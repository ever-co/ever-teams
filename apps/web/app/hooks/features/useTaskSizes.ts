import { ITaskSizesCreate } from '@app/interfaces';
import {
	createTaskSizesAPI,
	deleteTaskSizesAPI,
	getTaskSizesList,
	editTaskSizesAPI,
} from '@app/services/client/api';
import { activeTeamIdState, userState } from '@app/stores';
import {
	taskSizesFetchingState,
	taskSizesListState,
} from '@app/stores/task-sizes';
import { useCallback, useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { useFirstLoad } from '../useFirstLoad';
import { useQuery } from '../useQuery';

export function useTaskSizes() {
	const [user] = useRecoilState(userState);
	const activeTeamId = useRecoilValue(activeTeamIdState);

	const { loading, queryCall } = useQuery(getTaskSizesList);
	const { loading: createTaskSizesLoading, queryCall: createQueryCall } =
		useQuery(createTaskSizesAPI);
	const { loading: deleteTaskSizesLoading, queryCall: deleteQueryCall } =
		useQuery(deleteTaskSizesAPI);
	const { loading: editTaskSizesLoading, queryCall: editQueryCall } =
		useQuery(editTaskSizesAPI);

	const [taskSizes, setTaskSizes] = useRecoilState(taskSizesListState);
	// const activeTaskStatus = useRecoilValue(activeTaskStatusState);
	// const [, setActiveTaskStatusId] = useRecoilState(activeTaskStatusIdState);
	const [taskSizesFetching, setTaskSizesFetching] = useRecoilState(
		taskSizesFetchingState
	);
	const { firstLoadData: firstLoadTaskSizesData, firstLoad } = useFirstLoad();

	useEffect(() => {
		if (firstLoad) {
			setTaskSizesFetching(loading);
		}
	}, [loading, firstLoad, setTaskSizesFetching]);

	useEffect(() => {
		if (!firstLoad) return;

		queryCall(
			user?.tenantId as string,
			user?.employee?.organizationId as string,
			activeTeamId || null
		).then((res) => {
			setTaskSizes(res?.data?.data?.items || []);
			return res;
		});
	}, [activeTeamId, firstLoad]);

	const createTaskSizes = useCallback(
		(data: ITaskSizesCreate) => {
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
							setTaskSizes(res?.data?.data?.items || []);
							return res;
						});
					}

					return res;
				});
			}
		},

		[
			createQueryCall,
			createTaskSizesLoading,
			deleteTaskSizesLoading,
			user,
			activeTeamId,
		]
	);

	const deleteTaskSizes = useCallback(
		(id: string) => {
			if (user?.tenantId) {
				return deleteQueryCall(id).then((res) => {
					queryCall(
						user?.tenantId as string,
						user?.employee?.organizationId as string,
						activeTeamId || null
					).then((res) => {
						setTaskSizes(res?.data?.data?.items || []);
						return res;
					});
					return res;
				});
			}
		},
		[
			deleteQueryCall,
			taskSizes.length,
			createTaskSizesLoading,
			deleteTaskSizesLoading,
			user,
			activeTeamId,
		]
	);

	const editTaskSizes = useCallback(
		(id: string, data: ITaskSizesCreate) => {
			if (user?.tenantId) {
				return editQueryCall(id, data, user?.tenantId || '').then((res) => {
					queryCall(
						user?.tenantId as string,
						user?.employee?.organizationId as string,
						activeTeamId || null
					).then((res) => {
						setTaskSizes(res?.data?.data?.items || []);
						return res;
					});
					return res;
				});
			}
		},
		[editTaskSizesLoading, user, activeTeamId]
	);

	return {
		// loadTaskStatus,
		loading: taskSizesFetching,
		taskSizes,
		taskSizesFetching,
		firstLoadTaskSizesData,
		createTaskSizes,
		deleteTaskSizes,
		createTaskSizesLoading,
		deleteTaskSizesLoading,
		editTaskSizesLoading,
		editTaskSizes,
		setTaskSizes,
	};
}
