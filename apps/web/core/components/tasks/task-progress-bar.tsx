import { useTaskStatistics } from '@/core/hooks';
import { Nullable } from '@/core/types/generics/utils';
import { activeTeamState, timerSecondsState } from '@/core/stores';
import { atom, useAtomValue } from 'jotai';
import RadialProgress from '@/core/components/common/radial-progress';
import { ProgressBar } from '../duplicated-components/_progress-bar';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { getTaskTotalWorkedDuration } from '@/core/lib/utils/task.utils';

// Read instead of the timer by the bars that do not follow it, so they skip its per-second updates
const noTimerSecondsState = atom(0);

export function TaskProgressBar({
	isAuthUser,
	task,
	activeAuthTask,
	showPercents,
	radial
}: {
	isAuthUser: boolean | undefined;
	task: Nullable<TTask>;
	activeAuthTask: boolean;
	showPercents?: boolean;
	radial?: boolean;
}) {
	// Only the authenticated user's active task moves with the local timer. The other bars (two per team member
	// row) would otherwise re-render every second for a value they ignore below.
	const seconds = useAtomValue(isAuthUser && activeAuthTask ? timerSecondsState : noTimerSecondsState);
	const { getEstimation } = useTaskStatistics(isAuthUser && activeAuthTask ? seconds : 0);

	const activeTeam = useAtomValue(activeTeamState);
	//removed as when certain task's timer was active it was affecting the timers with no estimations. Was taking user's previous task's estimation
	// const currentMember = activeTeam?.members.find(
	// 	(member) => member.id === memberInfo?.member?.id
	// );
	const totalWorkedTasksTimer = getTaskTotalWorkedDuration(activeTeam?.members, task?.id);

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
