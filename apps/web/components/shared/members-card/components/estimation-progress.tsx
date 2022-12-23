import { useTaskStatistics } from '@app/hooks/features/useTaskStatistics';
import { ITeamTask } from '@app/interfaces/ITask';
import { timerSecondsState } from '@app/stores';
import { ProgressBar } from '@components/ui/progress-bar';
import { useRecoilValue } from 'recoil';

export function EstimationProgress({
	isAuthUser,
}: {
	memberTask: ITeamTask | null;
	isAuthUser: boolean;
}) {
	const seconds = useRecoilValue(timerSecondsState);
	const { activeTaskEstimation } = useTaskStatistics(isAuthUser ? seconds : 0);

	return (
		<div className="mb-3">
			<ProgressBar
				width={200}
				progress={`${isAuthUser ? activeTaskEstimation : 0}%`}
			/>
		</div>
	);
}
