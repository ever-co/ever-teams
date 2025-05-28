import { useTaskStatistics } from '@/core/hooks/tasks/use-task-statistics';
import { ITask } from '@/core/types/interfaces/task/task';
import { timerSecondsState } from '@/core/stores';
import { ProgressBar } from '@/core/components/common/progress-bar';
import { useAtomValue } from 'jotai';

export function EstimationProgress({ isAuthUser }: { memberTask: ITask | null; isAuthUser: boolean }) {
	const seconds = useAtomValue(timerSecondsState);
	const { activeTaskEstimation } = useTaskStatistics(isAuthUser ? seconds : 0);

	return (
		<div className="mb-3">
			<ProgressBar width={200} progress={`${isAuthUser ? activeTaskEstimation : 0}%`} />
		</div>
	);
}
