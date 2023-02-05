import { getTaskstatusList } from '@app/services/client/api';
import {
	userState,
	activeTaskStatusIdState,
	taskStatusFetchingState,
	taskStatusListState,
} from '@app/stores';
import { useEffect } from 'react';
import { useRecoilState } from 'recoil';
import { useFirstLoad } from '../useFirstLoad';
import { useQuery } from '../useQuery';

export function useTaskStatus() {
	const [user] = useRecoilState(userState);

	const { loading, queryCall } = useQuery(getTaskstatusList);
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

	return {
		// loadTaskStatus,
		loading,
		taskStatus,
		taskStatusFetching,
		firstLoadTaskStatusData,
	};
}
