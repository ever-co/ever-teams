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
	const { getEstimation } = useTaskStatistics(
		isAuthUser && activeAuthTask ? seconds : 0
	);

	const { activeTeam } = useOrganizationTeams();
	const currentMember = activeTeam?.members.find(
		(member) => member.id === memberInfo?.member?.id
	);
	const progress = getEstimation(
		currentMember?.totalWorkedTasks
			? currentMember?.totalWorkedTasks.find((t) => t.id === task?.id) || null
			: null,
		task,
		0
	);

	return (
		<ProgressBar
			width="100%"
			progress={`${progress}%`}
			showPercents={showPercents}
		/>
	);
}
