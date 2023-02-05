import { ITaskStatusCreate } from '@app/interfaces';
import {
	createTaskStatusAPI,
	getTaskstatusList,
} from '@app/services/client/api';
import {
	userState,
	activeTaskStatusIdState,
	taskStatusFetchingState,
	taskStatusListState,
} from '@app/stores';
import { useCallback, useEffect } from 'react';
import { useRecoilState } from 'recoil';
import { useFirstLoad } from '../useFirstLoad';
import { useQuery } from '../useQuery';

export function useTaskStatus() {
	const [user] = useRecoilState(userState);

	const { loading, queryCall } = useQuery(getTaskstatusList);
	const { loading: createTaskStatusLoading, queryCall: createQueryCall } =
		useQuery(createTaskStatusAPI);
	const [taskStatus, setTaskStatus] = useRecoilState(taskStatusListState);
	// const activeTaskStatus = useRecoilValue(activeTaskStatusState);
	// const [, setActiveTaskStatusId] = useRecoilState(activeTaskStatusIdState);
	const [taskStatusFetching, setTaskStatusFetching] = useRecoilState(
		taskStatusFetchingState
	);
	const { firstLoadData: firstLoadTaskStatusData } = useFirstLoad();

	useEffect(() => {
		setTaskStatusFetching(loading);
	}, [loading, setTaskStatusFetching]);

	// const loadTaskStatus = useCallback(() => {
	// 	setActiveTaskStatusId(getActiveTaskStatusIdCookie());
	// 	console.log
	// 	if (user) {

	// 	}
	// }, [queryCall, setActiveTaskStatusId, setTaskStatuss, user]);
	useEffect(() => {
		queryCall(
			user?.tenantId as string,
			user?.employee?.organizationId as string
		).then((res) => {
			setTaskStatus(res?.data?.data?.items || []);
			return res;
		});
	}, []);

	const createTaskStatus = useCallback(
		(data: ITaskStatusCreate) => {
			if (user?.tenantId) {
				return createQueryCall(data, user?.tenantId || '').then((res) => {
					const dt = res.data?.items || [];
					console.log('New Data', dt);

					// setTeams(dt);
					// const created = dt.find((t) => t.name === $name);
					// if (created) {
					// 	setActiveTeamIdCookie(created.id);
					// 	setOrganizationIdCookie(created.organizationId);
					// 	// This must be called at the end (Update store)
					// 	setActiveTeamId(created.id);
					// }
					return res;
				});
			}
		},
		// [queryCall, setActiveTeamId, setTeams]
		[createQueryCall]
	);

	return {
		// loadTaskStatus,
		loading,
		taskStatus,
		taskStatusFetching,
		firstLoadTaskStatusData,
		createTaskStatus,
		createTaskStatusLoading,
	};
}
