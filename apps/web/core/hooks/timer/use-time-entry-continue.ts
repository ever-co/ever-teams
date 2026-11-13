'use client';

import { useStore } from 'jotai';
import { useCallback, useRef } from 'react';

import { useSyncRef } from '@/core/hooks/common/use-sync-ref';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { canMemberTrackTime } from '@/core/lib/helpers/team-member-tracking';
import { type ContinueViewer, continuableTaskOf, tasksByIdOf, timerCarryOf } from '@/core/lib/utils/time-entry-reuse';
import { activeTeamState, teamTasksState } from '@/core/stores';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { TOrganizationTeam } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import type { TUser } from '@/core/types/schemas/user/user.schema';

import type { StartTimerOn } from './use-timer-task-start';

/** The switches Gauzy checks before a start: the member's own and the one of their membership in the active team. */
function isTrackingOnFor(team: TOrganizationTeam | null, userId: string | undefined) {
	if (!userId) {
		return false;
	}
	const members = team?.members ?? [];
	return members.some((member) => {
		const isUser = member.employee?.userId === userId;
		return isUser && canMemberTrackTime(member);
	});
}

function continueViewerOf(user: TUser | null | undefined, team: TOrganizationTeam | null): ContinueViewer {
	const isEmailVerified = Boolean(user?.isEmailVerified);
	const isTrackingOn = isTrackingOnFor(team, user?.id);
	return {
		userId: user?.id,
		employeeId: user?.employee?.id,
		canTrackTime: isEmailVerified && isTrackingOn
	};
}

interface ReachableTasks {
	tasks: TTask[];
	byId: Map<string, TTask>;
}

/**
 * Continue for the time entries of a page: whether an entry offers it, and the start it asks for. The team, its tasks
 * and the member are read when a menu opens or an entry is continued, so the rows that hold these functions do not
 * re-render when the team or its task list refreshes.
 */
export function useTimeEntryContinue(startOn: StartTimerOn) {
	const store = useStore();
	const { data: user } = useUserQuery();
	const userRef = useSyncRef(user);
	const reachableRef = useRef<ReachableTasks | null>(null);

	const reachableTasksOf = useCallback((tasks: TTask[]) => {
		const cached = reachableRef.current;
		if (cached?.tasks === tasks) {
			return cached.byId;
		}
		const byId = tasksByIdOf(tasks);
		reachableRef.current = { tasks, byId };
		return byId;
	}, []);

	const continuableTask = useCallback(
		(log: ITimeLog): TTask | null => {
			const team = store.get(activeTeamState);
			const viewer = continueViewerOf(userRef.current, team);
			const reachableTasks = reachableTasksOf(store.get(teamTasksState));
			return continuableTaskOf(log, viewer, reachableTasks);
		},
		[reachableTasksOf, store, userRef]
	);

	const canContinue = useCallback((log: ITimeLog) => continuableTask(log) !== null, [continuableTask]);

	const continueLog = useCallback(
		(log: ITimeLog) => {
			const task = continuableTask(log);
			if (!task) {
				return;
			}
			startOn(task, timerCarryOf(log));
		},
		[continuableTask, startOn]
	);

	return { canContinue, continueLog };
}
