import { atom } from 'jotai';
import { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';
import { isTimerTaskOfTeam } from '@/core/lib/utils/task.utils';
import { activeTeamIdState } from '../teams/organization-team';
import { activeTeamTaskState, teamTasksState } from '../teams/team-tasks';
import { timerStatusState } from './timer';

/**
 * The timer status as `useTimerApi` exposes it (`filteredTimerStatus`): a timer running for another team reads as
 * stopped. Components that only display the status read this atom instead of mounting a whole timer API each.
 *
 * A run is the active team's when its log names that team, whatever project its task is in: the team's task list
 * follows its default project only, and after a reload no active task holds a task of another project (#5122). A log
 * that names no team is the team's when its task is one of the team's listed tasks or the active task.
 */
export const teamTimerStatusState = atom<ITimerStatus | null>((get) => {
	const timerStatus = get(timerStatusState);
	if (!timerStatus) {
		return null;
	}
	if (!timerStatus.running) {
		return timerStatus;
	}
	const currentTaskId = timerStatus.lastLog?.taskId;
	if (!currentTaskId) {
		return timerStatus;
	}
	const runTeamId = timerStatus.lastLog?.organizationTeamId;
	const isActiveTeamRun = runTeamId
		? runTeamId === get(activeTeamIdState)
		: isTimerTaskOfTeam(currentTaskId, get(teamTasksState), get(activeTeamTaskState));
	if (isActiveTeamRun) {
		return timerStatus;
	}
	return { ...timerStatus, running: false };
});
