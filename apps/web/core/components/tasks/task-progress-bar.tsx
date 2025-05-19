import { I_TeamMemberCardHook, useOrganizationTeams, useTaskStatistics } from '@/core/hooks';
import { ITeamTask, Nullable } from '@/core/types/interfaces';
import { timerSecondsState } from '@/core/stores';
import { ProgressBar } from '@/core/components';
import { useAtomValue } from 'jotai';
import RadialProgress from '@/core/components/common/radial-progress';

export function TaskProgressBar({
	isAuthUser,
	task,
	activeAuthTask,
	showPercents,
	radial
}: // memberInfo,
{
	isAuthUser: boolean | undefined;
	task: Nullable<ITeamTask>;
	activeAuthTask: boolean;
	showPercents?: boolean;
	memberInfo?: I_TeamMemberCardHook;
	radial?: boolean;
}) {
	const seconds = useAtomValue(timerSecondsState);
	const { getEstimation /*, addSeconds*/ } = useTaskStatistics(isAuthUser && activeAuthTask ? seconds : 0);

	const { activeTeam } = useOrganizationTeams();
	//removed as when certain task's timer was active it was affecting the timers with no estimations. Was taking user's previous task's estimation
	// const currentMember = activeTeam?.members.find(
	// 	(member) => member.id === memberInfo?.member?.id
	// );
	let totalWorkedTasksTimer = 0;
	activeTeam?.members?.forEach((member) => {
		const totalWorkedTasks = member?.totalWorkedTasks?.find((item) => item.id === task?.id) || null;
		if (totalWorkedTasks) {
			totalWorkedTasksTimer += totalWorkedTasks.duration;
		}
	});

	const progress = getEstimation(
		null,
		task,
		/*addSeconds || */ totalWorkedTasksTimer || 1,
		task?.estimate || 0 //<-- task?.estimate || currentMember?.lastWorkedTask?.estimate || 0 - removed as when certain task's timer was active it was affecting the timers with no estimations. Was taking user's previous task's estimation
	);

	return radial ? (
		<RadialProgress percentage={progress} />
	) : (
		<ProgressBar width="100%" progress={`${progress || 0}%`} showPercents={showPercents} />
	);
}
