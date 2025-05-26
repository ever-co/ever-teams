import { I_TeamMemberCardHook, useOrganizationTeams, useTaskStatistics } from '@/core/hooks';
import { ITask } from '@/core/types/interfaces/task/ITask';
import { Nullable } from '@/core/types/generics/utils';
import { timerSecondsState } from '@/core/stores';
import { useAtomValue } from 'jotai';
import RadialProgress from '@/core/components/common/radial-progress';
import { ProgressBar } from '../duplicated-components/_progress-bar';
import { IEmployee } from '@/core/types/interfaces/organization/employee/IEmployee';

export function TaskProgressBar({
	isAuthUser,
	task,
	activeAuthTask,
	showPercents,
	radial
}: // memberInfo,
{
	isAuthUser: boolean | undefined;
	task: Nullable<ITask>;
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
	activeTeam?.members?.forEach((member: IEmployee) => {
		const totalWorkedTasks = member?.totalWorkedTasks?.find((item: ITask) => item.id === task?.id) || null;
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
