import { useTaskStatistics } from '@app/hooks';
import { ITeamTask, Nullable } from '@app/interfaces';
import { timerSecondsState } from '@app/stores';
import { ProgressBar } from 'lib/components';
import { useRecoilValue } from 'recoil';

export function TaskProgressBar({
	isAuthUser,
	task,
	activeAuthTask,
}: {
	isAuthUser: boolean | undefined;
	task: Nullable<ITeamTask>;
	activeAuthTask: boolean;
}) {
	const seconds = useRecoilValue(timerSecondsState);
	const { activeTaskEstimation, getTaskStat, getEstimation } =
		useTaskStatistics(isAuthUser && activeAuthTask ? seconds : 0);

	let progress = activeTaskEstimation;

	if (!isAuthUser) {
		const { taskTotalStat } = getTaskStat(task);
		progress = getEstimation(taskTotalStat, task, 0);
	}

	return <ProgressBar width="100%" progress={`${progress}%`} />;
}
