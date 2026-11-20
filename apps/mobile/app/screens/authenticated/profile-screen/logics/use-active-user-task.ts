import { useMemo } from 'react';
import type { ITeamTask } from '../../../../services/interfaces/ITask';

/**
 * The task a person's Tasks tab shows under Now: the timer's task on one's own tab, the last worked task on someone
 * else's. It follows both as they load: the timer's task often arrives after the tab is drawn.
 */
export function useActiveUserTask(
	isAuthUser: boolean,
	activeTask: ITeamTask | null | undefined,
	lastWorkedTask: ITeamTask | null | undefined
): ITeamTask | null | undefined {
	return useMemo(() => {
		if (isAuthUser) {
			return activeTask;
		}
		return lastWorkedTask;
	}, [isAuthUser, activeTask, lastWorkedTask]);
}
