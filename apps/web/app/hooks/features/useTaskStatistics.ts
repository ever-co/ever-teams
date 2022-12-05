import { ITeamTask } from '@app/interfaces/ITask';
import { tasksTimesheetStatisticsAPI } from '@app/services/client/api';
import {
	activeTeamIdState,
	activeTeamTaskState,
	tasksStatisticsState,
	timerStatusState,
} from '@app/stores';
import { useCallback, useEffect, useRef } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { useFirstLoad } from '../useFirstLoad';
import { useQuery } from '../useQuery';
import debounce from 'lodash/debounce';

export function useTaskStatistics(task?: ITeamTask | null) {
	const [stasks, setSTasks] = useRecoilState(tasksStatisticsState);
	const { queryCall } = useQuery(tasksTimesheetStatisticsAPI);
	const { firstLoad, firstLoadData: firstLoadtasksStatisticsData } =
		useFirstLoad();

	const initialLoad = useRef(false);

	// Dep status
	const timerStatus = useRecoilValue(timerStatusState);
	const activeTeamId = useRecoilValue(activeTeamIdState);
	const activeTeamTask = useRecoilValue(activeTeamTaskState);

	const loadData = useCallback(() => {
		const promise = queryCall();
		promise.then(({ data }) => {
			data.global && setSTasks(data.global);
		});
		return promise;
	}, []);

	const loadByDelay = useCallback(debounce(loadData, 100), []);

	useEffect(() => {
		if (firstLoad) {
			loadData().then(() => {
				initialLoad.current = true;
			});
		}
	}, [firstLoad]);

	useEffect(() => {
		if (firstLoad && initialLoad.current) {
			loadByDelay();
		}
	}, [firstLoad, timerStatus, activeTeamId, activeTeamTask]);

	const stask = task ? stasks.find((t) => t.id === task.id) : undefined;

	return {
		firstLoadtasksStatisticsData,
		stasks,
		stask,
		estimation:
			task && task.estimate && stask
				? Math.min(Math.floor((stask.duration * 100) / task.estimate), 100)
				: 0,
	};
}
