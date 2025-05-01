'use client';

import { ITaskPrioritiesCreate } from '@/core/types/interfaces';
import {
	getTaskPrioritiesList,
	deleteTaskPrioritiesAPI,
	createTaskPrioritiesAPI,
	editTaskPrioritiesAPI
} from '@/core/services/client/api';
import { userState, taskPrioritiesListState, activeTeamIdState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useFirstLoad } from '../useFirstLoad';
import { useQuery } from '../useQuery';
import isEqual from 'lodash/isEqual';
import { getActiveTeamIdCookie } from '@/core/lib/helpers/index';

export function useTaskPriorities() {
	const [user] = useAtom(userState);
	const activeTeamId = useAtomValue(activeTeamIdState);

	const {
		loading: getTaskPrioritiesLoading,
		queryCall: getTaskPrioritiesQueryCall,
		loadingRef: getTaskPrioritiesLoadingRef
	} = useQuery(getTaskPrioritiesList);
	const { loading: createTaskPrioritiesLoading, queryCall: createQueryCall } = useQuery(createTaskPrioritiesAPI);
	const { loading: deleteTaskPrioritiesLoading, queryCall: deleteQueryCall } = useQuery(deleteTaskPrioritiesAPI);
	const { loading: editTaskPrioritiesLoading, queryCall: editQueryCall } = useQuery(editTaskPrioritiesAPI);

	const [taskPriorities, setTaskPriorities] = useAtom(taskPrioritiesListState);

	const { firstLoadData: firstLoadTaskPrioritiesData } = useFirstLoad();

	const loadTaskPriorities = useCallback(async () => {
		if (getTaskPrioritiesLoadingRef.current) {
			return;
		}

		const teamId = getActiveTeamIdCookie();
		getTaskPrioritiesQueryCall(
			user?.tenantId as string,
			user?.employee?.organizationId as string,
			activeTeamId || teamId || null
		).then((res) => {
			if (!isEqual(res?.data?.items || [], taskPriorities)) {
				setTaskPriorities(res?.data?.items || []);
			}

			return res;
		});
	}, [
		getTaskPrioritiesLoadingRef,
		getTaskPrioritiesQueryCall,
		user?.tenantId,
		user?.employee?.organizationId,
		activeTeamId,
		taskPriorities,
		setTaskPriorities
	]);

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
					getTaskPrioritiesQueryCall(
						user?.tenantId as string,
						user?.employee?.organizationId as string,
						activeTeamId || null
					).then((res) => {
						setTaskPriorities(res?.data?.items || []);
						return res;
					});
					return res;
				});
			}
		},
		[
			user?.tenantId,
			user?.employee?.organizationId,
			deleteQueryCall,
			getTaskPrioritiesQueryCall,
			activeTeamId,
			setTaskPriorities
		]
	);

	const editTaskPriorities = useCallback(
		(id: string, data: ITaskPrioritiesCreate) => {
			if (user?.tenantId) {
				return editQueryCall(id, data, user?.tenantId || '').then((eRes) => {
					getTaskPrioritiesQueryCall(
						user?.tenantId as string,
						user?.employee?.organizationId as string,
						activeTeamId || null
					).then((res) => {
						setTaskPriorities(res?.data?.items || []);
						return res;
					});
					return eRes;
				});
			}
		},
		[
			user?.tenantId,
			user?.employee?.organizationId,
			editQueryCall,
			getTaskPrioritiesQueryCall,
			activeTeamId,
			setTaskPriorities
		]
	);

	const handleFirstLoad = useCallback(async () => {
		await loadTaskPriorities();
		firstLoadTaskPrioritiesData();
	}, [firstLoadTaskPrioritiesData, loadTaskPriorities]);

	return {
		loading: getTaskPrioritiesLoading,
		taskPriorities,
		firstLoadTaskPrioritiesData: handleFirstLoad,
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
