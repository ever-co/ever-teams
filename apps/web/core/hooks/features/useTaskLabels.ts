'use client';

import { ITaskLabelsCreate } from '@/core/types/interfaces';
import { userState, taskLabelsListState, activeTeamIdState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useFirstLoad } from '../useFirstLoad';
import { useQuery } from '../useQuery';
import isEqual from 'lodash/isEqual';
import { getActiveTeamIdCookie } from '@/core/lib/helpers/index';
import { taskLabelService } from '@/core/services/client/api/tasks/task-label.service';

export function useTaskLabels() {
	const [user] = useAtom(userState);
	const activeTeamId = useAtomValue(activeTeamIdState);

	const {
		loading: getTaskLabelsLoading,
		queryCall: getTaskLabelsQueryCall,
		loadingRef: getTaskLabelsLoadingRef
	} = useQuery(taskLabelService.getTaskLabelsList);
	const { loading: createTaskLabelsLoading, queryCall: createQueryCall } = useQuery(
		taskLabelService.createTaskLabels
	);
	const { loading: deleteTaskLabelsLoading, queryCall: deleteQueryCall } = useQuery(
		taskLabelService.deleteTaskLabels
	);
	const { loading: editTaskLabelsLoading, queryCall: editQueryCall } = useQuery(taskLabelService.editTaskLabels);

	const [taskLabels, setTaskLabels] = useAtom(taskLabelsListState);

	const { firstLoadData: firstLoadTaskLabelsData } = useFirstLoad();

	const loadTaskLabels = useCallback(async () => {
		if (getTaskLabelsLoadingRef.current) {
			return;
		}
		const teamId = getActiveTeamIdCookie();
		getTaskLabelsQueryCall(
			user?.tenantId as string,
			user?.employee?.organizationId as string,
			activeTeamId || teamId || null
		).then((res) => {
			if (!isEqual(res?.data?.items || [], taskLabels)) {
				setTaskLabels(res?.data?.items || []);
			}

			return res;
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [user, activeTeamId, setTaskLabels, taskLabels, getTaskLabelsQueryCall]);

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
					if (res?.data && res?.data?.name) {
						getTaskLabelsQueryCall(
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

		[createQueryCall, user, activeTeamId, getTaskLabelsQueryCall, setTaskLabels]
	);

	const deleteTaskLabels = useCallback(
		(id: string) => {
			if (user?.tenantId) {
				return deleteQueryCall(id).then((res) => {
					getTaskLabelsQueryCall(
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
		[deleteQueryCall, user, activeTeamId, getTaskLabelsQueryCall, setTaskLabels]
	);

	const editTaskLabels = useCallback(
		(id: string, data: ITaskLabelsCreate) => {
			if (user?.tenantId) {
				return editQueryCall(id, data, user?.tenantId || '').then((res) => {
					getTaskLabelsQueryCall(
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
		[user, activeTeamId, editQueryCall, getTaskLabelsQueryCall, setTaskLabels]
	);

	const handleFirstLoad = useCallback(async () => {
		await loadTaskLabels();
		firstLoadTaskLabelsData();
	}, [firstLoadTaskLabelsData, loadTaskLabels]);

	return {
		loading: getTaskLabelsLoading,
		taskLabels,
		firstLoadTaskLabelsData: handleFirstLoad,
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
