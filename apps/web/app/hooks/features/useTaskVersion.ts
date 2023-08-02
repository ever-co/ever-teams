import { ITaskVersionCreate } from '@app/interfaces';
import {
	createTaskVersionAPI,
	getTaskversionList,
	deleteTaskVersionAPI,
	editTaskVersionAPI,
} from '@app/services/client/api';
import {
	userState,
	taskVersionFetchingState,
	taskVersionListState,
	activeTeamIdState,
} from '@app/stores';
import { useCallback, useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { useFirstLoad } from '../useFirstLoad';
import { useQuery } from '../useQuery';
import isEqual from 'lodash/isEqual';
import { useCallbackRef } from '../useCallbackRef';

export function useTaskVersion(
	onVersionCreated?: (version: ITaskVersionCreate) => void
) {
	const [user] = useRecoilState(userState);
	const activeTeamId = useRecoilValue(activeTeamIdState);

	const { loading, queryCall } = useQuery(getTaskversionList);
	const { loading: createTaskVersionLoading, queryCall: createQueryCall } =
		useQuery(createTaskVersionAPI);
	const { loading: deleteTaskVersionLoading, queryCall: deleteQueryCall } =
		useQuery(deleteTaskVersionAPI);
	const { loading: editTaskVersionLoading, queryCall: editQueryCall } =
		useQuery(editTaskVersionAPI);

	const [taskVersion, setTaskVersion] = useRecoilState(taskVersionListState);
	const $onVersionCreated = useCallbackRef(onVersionCreated);

	const [taskVersionFetching, setTaskVersionFetching] = useRecoilState(
		taskVersionFetchingState
	);
	const { firstLoadData: firstLoadTaskVersionData, firstLoad } = useFirstLoad();

	useEffect(() => {
		if (firstLoad) {
			setTaskVersionFetching(loading);
		}
	}, [loading, firstLoad, setTaskVersionFetching]);

	const loadTaskVersionData = useCallback(() => {
		queryCall(
			user?.tenantId as string,
			user?.employee?.organizationId as string,
			activeTeamId || null
		).then((res) => {
			if (!isEqual(res?.data?.data?.items || [], taskVersion)) {
				setTaskVersion(res?.data?.data?.items || []);
			}
			return res;
		});
	}, [user, activeTeamId, setTaskVersion, taskVersion]);

	useEffect(() => {
		if (!firstLoad) return;
		loadTaskVersionData();
	}, [activeTeamId, firstLoad]);

	const createTaskVersion = useCallback(
		(data: ITaskVersionCreate) => {
			if (user?.tenantId) {
				return createQueryCall(
					{ ...data, organizationTeamId: activeTeamId },
					user?.tenantId || ''
				).then((res) => {
					if (res?.data?.data && res?.data?.data?.name) {
						$onVersionCreated.current &&
							$onVersionCreated.current(res?.data?.data);

						queryCall(
							user?.tenantId as string,
							user?.employee?.organizationId as string,
							activeTeamId || null
						).then((res) => {
							setTaskVersion(res?.data?.data?.items || []);
							return res;
						});
					}

					return res;
				});
			}
		},

		[
			$onVersionCreated,
			createQueryCall,
			createTaskVersionLoading,
			deleteTaskVersionLoading,
			activeTeamId,
		]
	);

	const deleteTaskVersion = useCallback(
		(id: string) => {
			if (user?.tenantId) {
				return deleteQueryCall(id).then((res) => {
					queryCall(
						user?.tenantId as string,
						user?.employee?.organizationId as string,
						activeTeamId || null
					).then((res) => {
						setTaskVersion(res?.data?.data?.items || []);
						return res;
					});
					return res;
				});
			}
		},
		[
			deleteQueryCall,
			taskVersion.length,
			createTaskVersionLoading,
			deleteTaskVersionLoading,
			user,
			activeTeamId,
		]
	);

	const editTaskVersion = useCallback(
		(id: string, data: ITaskVersionCreate) => {
			console.log(user);

			if (user?.tenantId) {
				return editQueryCall(id, data, user?.tenantId || '').then((res) => {
					queryCall(
						user?.tenantId as string,
						user?.employee?.organizationId as string,
						activeTeamId || null
					).then((res) => {
						setTaskVersion(res?.data?.data?.items || []);
						return res;
					});
					return res;
				});
			}
		},
		[editTaskVersionLoading, user, activeTeamId]
	);

	return {
		loading: taskVersionFetching,
		taskVersion,
		taskVersionFetching,
		firstLoadTaskVersionData,
		createTaskVersion,
		createTaskVersionLoading,
		deleteTaskVersionLoading,
		deleteTaskVersion,
		editTaskVersionLoading,
		editTaskVersion,
		setTaskVersion,
		loadTaskVersionData,
	};
}
