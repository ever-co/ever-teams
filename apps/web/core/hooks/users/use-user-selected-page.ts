'use client';

import { useCallback, useMemo } from 'react';
import { useAuthTeamTasks, useTeamTasks } from '../organizations';
import { useAuthenticateUser } from '../auth';
import { useGetTasksStatsData } from '../tasks';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { activeTeamState } from '@/core/stores';
import { useAtomValue } from 'jotai';

export function useUserSelectedPage(memberId='') {
	const activeTeam = useAtomValue(activeTeamState);
	const { activeTeamTask, updateTask, tasks } = useTeamTasks();

	const { user: auth } = useAuthenticateUser();

	const members = activeTeam?.members || [];

	const matchUser = members.find((m: any) => {
		return m.employee.userId === memberId;
	});

	const isAuthUser = auth?.employee?.userId === memberId;

	// NOTE_FIX: Use activeTaskId instead of lastWorkedTask for non-auth users
	// This ensures the active task is correctly displayed in UserTeamCardActivity
	// when the user changes their active task
	const activeUserTeamTask = useMemo(() => {
		if (isAuthUser) {
			return activeTeamTask;
		}

		if (matchUser?.activeTaskId) {
			return tasks.find((task) => task.id === matchUser.activeTaskId) || matchUser?.lastWorkedTask;
		}

		return matchUser?.lastWorkedTask;
	}, [isAuthUser, activeTeamTask, matchUser?.activeTaskId, matchUser?.lastWorkedTask, tasks]);

	const userProfile = isAuthUser ? auth : matchUser?.employee?.user;

	/* Filtering the tasks */
	const tasksGrouped = useAuthTeamTasks(userProfile);

	const employeeId = isAuthUser ? auth?.employee?.id : matchUser?.employeeId;

	const loadTaskStatsIObserverRef = useGetTasksStatsData(employeeId);

	const assignTask = useCallback(
		(task: TTask) => {
			if (!matchUser?.employeeId) {
				return Promise.resolve();
			}

			return updateTask({
				...task,
				members: [...(task.members || []), matchUser ? matchUser.employee : {}]
			});
		},
		[updateTask, matchUser]
	);

	return {
		isAuthUser,
		activeUserTeamTask,
		userProfile,
		tasksGrouped,
		member: matchUser,
		assignTask,
		loadTaskStatsIObserverRef
	};
}

// export type I_UserProfilePage = ReturnType<typeof useUserSelectedPage>;
