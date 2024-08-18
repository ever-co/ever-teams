'use client';

import { ITeamTask } from '@app/interfaces';
import { useParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { useAuthenticateUser } from './useAuthenticateUser';
import { useAuthTeamTasks } from './useAuthTeamTasks';
import { useOrganizationTeams } from './useOrganizationTeams';
import { useTeamTasks } from './useTeamTasks';
import { useRecoilValue } from 'recoil';
import { userDetailAccordion } from '@app/stores';
import { useGetTasksStatsData } from './useGetTasksStatsData';

export function useUserProfilePage() {
	const { activeTeam } = useOrganizationTeams();
	const { activeTeamTask, updateTask } = useTeamTasks();
	const userMemberId = useRecoilValue(userDetailAccordion);

	const { user: auth } = useAuthenticateUser();
	const params = useParams();
	const memberId: string = useMemo(() => {
		return (params?.memberId ?? userMemberId) as string;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [params, userMemberId]);

	const members = activeTeam?.members || [];

	const matchUser = members.find((m) => {
		return m.employee.userId === memberId;
	});

	const isAuthUser = auth?.employee?.userId === memberId;

	const activeUserTeamTask = isAuthUser ? activeTeamTask : matchUser?.lastWorkedTask;

	const userProfile = isAuthUser ? auth : matchUser?.employee.user;

	/* Filtering the tasks */
	const tasksGrouped = useAuthTeamTasks(userProfile);

	const employeeId = isAuthUser ? auth?.employee?.id : matchUser?.employeeId;

	const loadTaskStatsIObserverRef = useGetTasksStatsData(employeeId);

	const assignTask = useCallback(
		(task: ITeamTask) => {
			if (!matchUser?.employeeId) {
				return Promise.resolve();
			}

			return updateTask({
				...task,
				members: [...task.members, (matchUser?.employeeId ? { id: matchUser?.employeeId } : {}) as any]
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
