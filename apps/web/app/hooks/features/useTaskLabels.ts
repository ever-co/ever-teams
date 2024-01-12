'use client';

import { ITaskLabelsCreate } from '@app/interfaces';
import {
	getTaskLabelsList,
	deleteTaskLabelsAPI,
	createTaskLabelsAPI,
	editTaskLabelsAPI
} from '@app/services/client/api';
import { userState, taskLabelsListState, taskLabelsFetchingState, activeTeamIdState } from '@app/stores';
import { useCallback, useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { useFirstLoad } from '../useFirstLoad';
import { useQuery } from '../useQuery';
import isEqual from 'lodash/isEqual';
import { getActiveTeamIdCookie } from '@app/helpers';

export function useTaskLabels() {
	const [user] = useRecoilState(userState);
	const activeTeamId = useRecoilValue(activeTeamIdState);

	const { loading, queryCall, loadingRef } = useQuery(getTaskLabelsList);
	const { loading: createTaskLabelsLoading, queryCall: createQueryCall } = useQuery(createTaskLabelsAPI);
	const { loading: deleteTaskLabelsLoading, queryCall: deleteQueryCall } = useQuery(deleteTaskLabelsAPI);
	const { loading: editTaskLabelsLoading, queryCall: editQueryCall } = useQuery(editTaskLabelsAPI);

	const [taskLabels, setTaskLabels] = useRecoilState(taskLabelsListState);

	const [taskLabelsFetching, setTaskLabelsFetching] = useRecoilState(taskLabelsFetchingState);
	const { firstLoadData: firstLoadTaskLabelsData, firstLoad } = useFirstLoad();

	useEffect(() => {
		if (firstLoad) {
			setTaskLabelsFetching(loading);
		}
	}, [loading, firstLoad, setTaskLabelsFetching]);

	const loadTaskLabels = useCallback(() => {
		if (loadingRef.current) {
			return;
		}
		const teamId = getActiveTeamIdCookie();
		queryCall(
			user?.tenantId as string,
			user?.employee?.organizationId as string,
			activeTeamId || teamId || null
		).then((res) => {
			if (!isEqual(res?.data?.items || [], taskLabels)) {
				setTaskLabels(res?.data?.items || []);
			}

			return res;
		});
	}, [user, activeTeamId, setTaskLabels, taskLabels, queryCall]);

	useEffect(() => {
		if (!firstLoad) return;

		loadTaskLabels();
	}, [activeTeamId, firstLoad, loadTaskLabels]);

	const createTaskLabels = useCallback(
		(data: ITaskLabelsCreate) => {
			if (user?.tenantId) {
				return createQueryCall(
					{
						...data,
						organizationTeamId: activeTeamId as string
					},
					user?.tenantId || ''
				).then((res) => {
					if (res?.data?.data && res?.data?.data?.name) {
						queryCall(
							user?.tenantId as string,
							user?.employee?.organizationId as string,
							activeTeamId || null
						).then((res) => {
							setTaskLabels(res?.data?.items || []);
							return res;
						});
					}

					return res;
				});
			}
		},

		[createQueryCall, user, activeTeamId, queryCall, setTaskLabels]
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
						setTaskLabels(res?.data?.items || []);
						return res;
					});
					return res;
				});
			}
		},
		[deleteQueryCall, user, activeTeamId, queryCall, setTaskLabels]
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
						setTaskLabels(res?.data?.items || []);
						return res;
					});
					return res;
				});
			}
		},
		[user, activeTeamId, editQueryCall, queryCall, setTaskLabels]
	);

	return {
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
		loadTaskLabels
	};
}
