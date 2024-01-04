'use client';

import { ITaskPrioritiesCreate } from '@app/interfaces';
import {
	getTaskPrioritiesList,
	deleteTaskPrioritiesAPI,
	createTaskPrioritiesAPI,
	editTaskPrioritiesAPI
} from '@app/services/client/api';
import { userState, taskPrioritiesListState, taskPrioritiesFetchingState, activeTeamIdState } from '@app/stores';
import { useCallback, useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { useFirstLoad } from '../useFirstLoad';
import { useQuery } from '../useQuery';
import isEqual from 'lodash/isEqual';
import { getActiveTeamIdCookie } from '@app/helpers';

export function useTaskPriorities() {
	const [user] = useRecoilState(userState);
	const activeTeamId = useRecoilValue(activeTeamIdState);

	const { loading, queryCall, loadingRef } = useQuery(getTaskPrioritiesList);
	const { loading: createTaskPrioritiesLoading, queryCall: createQueryCall } = useQuery(createTaskPrioritiesAPI);
	const { loading: deleteTaskPrioritiesLoading, queryCall: deleteQueryCall } = useQuery(deleteTaskPrioritiesAPI);
	const { loading: editTaskPrioritiesLoading, queryCall: editQueryCall } = useQuery(editTaskPrioritiesAPI);

	const [taskPriorities, setTaskPriorities] = useRecoilState(taskPrioritiesListState);

	const [taskPrioritiesFetching, setTaskPrioritiesFetching] = useRecoilState(taskPrioritiesFetchingState);
	const { firstLoadData: firstLoadTaskPrioritiesData, firstLoad } = useFirstLoad();

	useEffect(() => {
		if (firstLoad) {
			setTaskPrioritiesFetching(loading);
		}
	}, [loading, firstLoad, setTaskPrioritiesFetching]);

	const loadTaskPriorities = useCallback(() => {
		if (loadingRef.current) {
			return;
		}

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
	}, [user, activeTeamId, setTaskPriorities, taskPriorities, queryCall, loadingRef]);

	useEffect(() => {
		if (!firstLoad) return;

		loadTaskPriorities();
	}, [activeTeamId, firstLoad, loadTaskPriorities]);

	const createTaskPriorities = useCallback(
		(data: ITaskPrioritiesCreate) => {
			if (user?.tenantId) {
				return createQueryCall({ ...data, organizationTeamId: activeTeamId }, user?.tenantId || '').then(
					(res) => {
						return res;
					}
				);
			}
		},

		[createQueryCall, user, activeTeamId]
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
		[deleteQueryCall, user, activeTeamId, queryCall, setTaskPriorities]
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
		[user, activeTeamId, editQueryCall, queryCall, setTaskPriorities]
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
		loadTaskPriorities
	};
}
