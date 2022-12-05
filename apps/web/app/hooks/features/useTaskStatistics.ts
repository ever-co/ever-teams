import { ITeamTask } from '@app/interfaces/ITask';
import { tasksTimesheetStatisticsAPI } from '@app/services/client/api';
import {
	activeTeamIdState,
	activeTeamTaskState,
	tasksStatisticsState,
	tasksTodayStatisticsState,
	timerStatusState,
} from '@app/stores';
import { useCallback, useEffect, useRef } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { useFirstLoad } from '../useFirstLoad';
import { useQuery } from '../useQuery';
import debounce from 'lodash/debounce';
import { ITasksTimesheet } from '@app/interfaces/ITimer';

export function useTaskStatistics(task?: ITeamTask | null, addSeconds = 0) {
	const [stasks, setSTasks] = useRecoilState(tasksStatisticsState);
	const [dtasks, setDTasks] = useRecoilState(tasksTodayStatisticsState);

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
			data.today && setDTasks(data.today);
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
	const dtask = task ? dtasks.find((t) => t.id === task.id) : undefined;

	const getEstimation = (_task: ITasksTimesheet) =>
		Math.min(
			Math.floor(((_task.duration + addSeconds) * 100) / (task?.estimate || 0)),
			100
		);

	return {
		firstLoadtasksStatisticsData,
		stasks,
		stask,
		dtasks,
		dtask,
		estimation: task && task.estimate && stask ? getEstimation(stask) : 0,
		dailyEstimation: task && task.estimate && dtask ? getEstimation(dtask) : 0,
	};
}
