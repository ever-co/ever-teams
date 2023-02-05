import {
	getTaskPrioritiesList,
	getTaskstatusList,
} from '@app/services/client/api';
import {
	userState,
	activeTaskStatusIdState,
	taskStatusFetchingState,
	taskStatusListState,
	taskPrioritiesListState,
	taskPrioritiesFetchingState,
} from '@app/stores';
import { useEffect } from 'react';
import { useRecoilState } from 'recoil';
import { useFirstLoad } from '../useFirstLoad';
import { useQuery } from '../useQuery';

export function useTaskPriorities() {
	const [user] = useRecoilState(userState);

	const { loading, queryCall } = useQuery(getTaskPrioritiesList);
	const [taskPriorities, setTaskPriorities] = useRecoilState(
		taskPrioritiesListState
	);
	// const activeTaskStatus = useRecoilValue(activeTaskStatusState);
	// const [, setActiveTaskStatusId] = useRecoilState(activeTaskStatusIdState);
	const [taskPrioritiesFetching, setTaskPrioritiesFetching] = useRecoilState(
		taskPrioritiesFetchingState
	);
	const { firstLoadData: firstLoadTaskPrioritiesData } = useFirstLoad();

	useEffect(() => {
		setTaskPrioritiesFetching(loading);
	}, [loading, setTaskPrioritiesFetching]);

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
			setTaskPriorities(res?.data?.data?.items || []);
			return res;
		});
	}, []);

	return {
		// loadTaskStatus,
		loading,
		taskPriorities,
		taskPrioritiesFetching,
		firstLoadTaskPrioritiesData,
	};
}
