'use client';
import { userDetailAccordion } from '@/core/stores';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useAtomValue } from 'jotai';
import { useParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { useAuthTeamTasks, useTeamTasks } from '../organizations';
import { useCurrentTeam } from '../organizations/teams/use-current-team';
import { useUserQuery } from '../queries/user-user.query';
import { useGetTasksStatsData } from '../tasks';

export function useUserProfilePage() {
	const activeTeam = useCurrentTeam();
	const { activeTeamTask, updateTask, tasks } = useTeamTasks();
	const userMemberId = useAtomValue(userDetailAccordion);

	const { data: auth } = useUserQuery();
	const params = useParams();
	const memberId: string = useMemo(() => {
		return (params?.memberId ?? userMemberId) as string;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [params, userMemberId]);

	const members = activeTeam?.members || [];

	const matchUser = useMemo(() => {
		return members.find((m) => {
			return m.employee?.userId === memberId;
		});
	}, [members, memberId]);

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

export type I_UserProfilePage = ReturnType<typeof useUserProfilePage>;
