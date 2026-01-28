import RadialProgress from '@/core/components/common/radial-progress';
import { I_TeamMemberCardHook, useTaskStatistics } from '@/core/hooks';
import { timerSecondsState } from '@/core/stores';
import { Nullable } from '@/core/types/generics/utils';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useAtomValue } from 'jotai';
import { ProgressBar } from '../duplicated-components/_progress-bar';
import { useCurrentTeam } from '@/core/hooks/organizations/teams/use-current-team';

export function TaskProgressBar({
	isAuthUser,
	task,
	activeAuthTask,
	showPercents,
	radial
}: // memberInfo,
{
	isAuthUser: boolean | undefined;
	task: Nullable<TTask>;
	activeAuthTask: boolean;
	showPercents?: boolean;
	memberInfo?: I_TeamMemberCardHook;
	radial?: boolean;
}) {
	const seconds = useAtomValue(timerSecondsState);
	const { getEstimation } = useTaskStatistics(isAuthUser && activeAuthTask ? seconds : 0);

	const activeTeam = useCurrentTeam();
	//removed as when certain task's timer was active it was affecting the timers with no estimations. Was taking user's previous task's estimation
	// const currentMember = activeTeam?.members.find(
	// 	(member) => member.id === memberInfo?.member?.id
	// );
	let totalWorkedTasksTimer = 0;
	activeTeam?.members?.forEach((member) => {
		const totalWorkedTasks = member?.totalWorkedTasks?.find((item: TTask) => item.id === task?.id) || null;
		if (totalWorkedTasks) {
			totalWorkedTasksTimer += totalWorkedTasks.duration || 0;
		}
	});

	// Add local timer seconds to total worked time for real-time progress updates
	// Only add seconds if this is the authenticated user's active task
	const addSeconds = isAuthUser && activeAuthTask ? seconds : 0;
	const totalTimeWithLocalTimer = totalWorkedTasksTimer + addSeconds;

	const progress = getEstimation(
		null,
		task,
		totalTimeWithLocalTimer || 0,
		task?.estimate || 0 //<-- task?.estimate || currentMember?.lastWorkedTask?.estimate || 0 - removed as when certain task's timer was active it was affecting the timers with no estimations. Was taking user's previous task's estimation
	);

	return radial ? (
		<RadialProgress percentage={progress} />
	) : (
		<ProgressBar width="100%" progress={`${progress || 0}%`} showPercents={showPercents} />
	);
}
