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
import isEqual from 'lodash/isEqual';
import { getActiveTeamIdCookie } from '@app/helpers';

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
	const { firstLoadData: firstLoadTaskPrioritiesData, firstLoad } =
		useFirstLoad();

	useEffect(() => {
		if (firstLoad) {
			setTaskPrioritiesFetching(loading);
		}
	}, [loading, firstLoad, setTaskPrioritiesFetching]);

	const loadTaskPriorities = useCallback(() => {
		const teamId = getActiveTeamIdCookie();
		queryCall(
			user?.tenantId as string,
			user?.employee?.organizationId as string,
			activeTeamId || teamId || null
		).then((res) => {
			if (!isEqual(res?.data?.data?.items || [], taskPriorities)) {
				setTaskPriorities(res?.data?.data?.items || []);
			}

			return res;
		});
	}, [user, activeTeamId, setTaskPriorities, taskPriorities]);

	useEffect(() => {
		if (!firstLoad) return;

		loadTaskPriorities();
	}, [activeTeamId, firstLoad]);

	const createTaskPriorities = useCallback(
		(data: ITaskPrioritiesCreate) => {
			if (user?.tenantId) {
				return createQueryCall(
					{ ...data, organizationTeamId: activeTeamId },
					user?.tenantId || ''
				).then((res) => {
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
		loading: taskPrioritiesFetching,
		taskPriorities,
		taskPrioritiesFetching,
		firstLoadTaskPrioritiesData,
		createTaskPriorities,
		createTaskPrioritiesLoading,
		deleteTaskPrioritiesLoading,
		deleteTaskPriorities,
		editTaskPriorities,
		editTaskPrioritiesLoading,
		setTaskPriorities,
		loadTaskPriorities,
	};
}
