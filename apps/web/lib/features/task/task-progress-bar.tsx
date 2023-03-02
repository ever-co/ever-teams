import {
	I_TeamMemberCardHook,
	useOrganizationTeams,
	useTaskStatistics,
} from '@app/hooks';
import { ITeamTask, Nullable } from '@app/interfaces';
import { timerSecondsState } from '@app/stores';
import { ProgressBar } from 'lib/components';
import { useRecoilValue } from 'recoil';

export function TaskProgressBar({
	isAuthUser,
	task,
	activeAuthTask,
	showPercents,
	memberInfo,
}: {
	isAuthUser: boolean | undefined;
	task: Nullable<ITeamTask>;
	activeAuthTask: boolean;
	showPercents?: boolean;
	memberInfo?: I_TeamMemberCardHook;
}) {
	const seconds = useRecoilValue(timerSecondsState);
	const { activeTaskEstimation, getTaskStat, getEstimation } =
		useTaskStatistics(isAuthUser && activeAuthTask ? seconds : 0);
	let progress = activeTaskEstimation;

	const { teams } = useOrganizationTeams();
	const currentPublicMember = teams[0]?.members.find(
		(member) => member.id === memberInfo?.member?.id
	);

	if (!isAuthUser || !activeAuthTask) {
		const { taskTotalStat } = getTaskStat(task);
		progress = getEstimation(taskTotalStat, task, 0);
	}

	if (!isAuthUser && currentPublicMember) {
		progress = getEstimation(
			currentPublicMember?.totalWorkedTasks
				? currentPublicMember?.totalWorkedTasks[0]
				: null,
			task,
			0
		);
	}

	return (
		<ProgressBar
			width="100%"
			progress={`${progress}%`}
			showPercents={showPercents}
		/>
	);
}
