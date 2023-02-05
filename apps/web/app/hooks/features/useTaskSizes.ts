import { getTaskSizesList } from '@app/services/client/api';
import { userState } from '@app/stores';
import {
	taskSizesFetchingState,
	taskSizesListState,
} from '@app/stores/task-sizes';
import { useEffect } from 'react';
import { useRecoilState } from 'recoil';
import { useFirstLoad } from '../useFirstLoad';
import { useQuery } from '../useQuery';

export function useTaskSizes() {
	const [user] = useRecoilState(userState);

	const { loading, queryCall } = useQuery(getTaskSizesList);
	const [taskSizes, setTaskSizes] = useRecoilState(taskSizesListState);
	// const activeTaskStatus = useRecoilValue(activeTaskStatusState);
	// const [, setActiveTaskStatusId] = useRecoilState(activeTaskStatusIdState);
	const [taskSizesFetching, setTaskSizesFetching] = useRecoilState(
		taskSizesFetchingState
	);
	const { firstLoadData: firstLoadTaskSizesData } = useFirstLoad();

	useEffect(() => {
		setTaskSizesFetching(loading);
	}, [loading, setTaskSizesFetching]);

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
			setTaskSizes(res?.data?.data?.items || []);
			return res;
		});
	}, []);

	return {
		// loadTaskStatus,
		loading,
		taskSizes,
		taskSizesFetching,
		firstLoadTaskSizesData,
	};
}
