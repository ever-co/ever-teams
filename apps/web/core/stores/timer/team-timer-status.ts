import { atom } from 'jotai';
import { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';
import { teamTasksState } from '../teams/team-tasks';
import { timerStatusState } from './timer';

/**
 * The timer status as `useTimerApi` exposes it (`filteredTimerStatus`): a timer running on a task outside the
 * active team's tasks reads as stopped. Components that only display the status read this atom instead of
 * mounting a whole timer API each.
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
	const teamTasks = get(teamTasksState);
	const taskBelongsToCurrentTeam = teamTasks.some((task) => task.id === currentTaskId);
	if (taskBelongsToCurrentTeam) {
		return timerStatus;
	}
	return { ...timerStatus, running: false };
});
