import { ITaskPrioritiesCreate } from '@app/interfaces';
import {
	getTaskPrioritiesList,
	deleteTaskPrioritiesAPI,
	createTaskPrioritiesAPI,
	editTaskPrioritiesAPI,
} from '@app/services/client/api';
import {
	userState,
	taskPrioritiesListState,
	taskPrioritiesFetchingState,
	activeTeamIdState,
} from '@app/stores';
import { useCallback, useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { useFirstLoad } from '../useFirstLoad';
import { useQuery } from '../useQuery';

export function useTaskPriorities() {
	const [user] = useRecoilState(userState);
	const activeTeamId = useRecoilValue(activeTeamIdState);

	const { loading, queryCall } = useQuery(getTaskPrioritiesList);
	const { loading: createTaskPrioritiesLoading, queryCall: createQueryCall } =
		useQuery(createTaskPrioritiesAPI);
	const { loading: deleteTaskPrioritiesLoading, queryCall: deleteQueryCall } =
		useQuery(deleteTaskPrioritiesAPI);
	const { loading: editTaskPrioritiesLoading, queryCall: editQueryCall } =
		useQuery(editTaskPrioritiesAPI);

	const [taskPriorities, setTaskPriorities] = useRecoilState(
		taskPrioritiesListState
	);

	const [taskPrioritiesFetching, setTaskPrioritiesFetching] = useRecoilState(
		taskPrioritiesFetchingState
	);
	const { firstLoadData: firstLoadTaskPrioritiesData } = useFirstLoad();

	useEffect(() => {
		setTaskPrioritiesFetching(loading);
	}, [loading, setTaskPrioritiesFetching]);

	useEffect(() => {
		queryCall(
			user?.tenantId as string,
			user?.employee?.organizationId as string,
			activeTeamId || null
		).then((res) => {
			setTaskPriorities(res?.data?.data?.items || []);
			return res;
		});
	}, [activeTeamId]);

	const createTaskPriorities = useCallback(
		(data: ITaskPrioritiesCreate) => {
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
							setTaskPriorities(res?.data?.data?.items || []);
							return res;
						});
					}

					return res;
				});
			}
		},

		[
			createQueryCall,
			createTaskPrioritiesLoading,
			deleteTaskPrioritiesLoading,
			user,
			activeTeamId,
		]
	);

	const deleteTaskPriorities = useCallback(
		(id: string) => {
			if (user?.tenantId) {
				return deleteQueryCall(id).then((res) => {
					queryCall(
						user?.tenantId as string,
						user?.employee?.organizationId as string,
						activeTeamId || null
					).then((res) => {
						setTaskPriorities(res?.data?.data?.items || []);
						return res;
					});
					return res;
				});
			}
		},
		[
			deleteQueryCall,
			taskPriorities.length,
			createTaskPrioritiesLoading,
			deleteTaskPrioritiesLoading,
			user,
			activeTeamId,
		]
	);

	const editTaskPriorities = useCallback(
		(id: string, data: ITaskPrioritiesCreate) => {
			if (user?.tenantId) {
				return editQueryCall(id, data, user?.tenantId || '').then((res) => {
					queryCall(
						user?.tenantId as string,
						user?.employee?.organizationId as string,
						activeTeamId || null
					).then((res) => {
						setTaskPriorities(res?.data?.data?.items || []);
						return res;
					});
					return res;
				});
			}
		},
		[editTaskPrioritiesLoading, user, activeTeamId]
	);

	return {
		// loadTaskStatus,
		loading,
		taskPriorities,
		taskPrioritiesFetching,
		firstLoadTaskPrioritiesData,
		createTaskPriorities,
		createTaskPrioritiesLoading,
		deleteTaskPrioritiesLoading,
		deleteTaskPriorities,
		editTaskPriorities,
		editTaskPrioritiesLoading,
	};
}
