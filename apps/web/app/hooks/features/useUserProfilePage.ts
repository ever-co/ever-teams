'use client';

import { ITeamTask } from '@app/interfaces';
import { useParams, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo } from 'react';
import { useAuthenticateUser } from './useAuthenticateUser';
import { useAuthTeamTasks } from './useAuthTeamTasks';
import { useOrganizationTeams } from './useOrganizationTeams';
import { useTaskStatistics } from './useTaskStatistics';
import { useTeamTasks } from './useTeamTasks';

export function useUserProfilePage() {
	const { activeTeam } = useOrganizationTeams();
	const { activeTeamTask, updateTask } = useTeamTasks();

	const { user: auth } = useAuthenticateUser();
	const { getTasksStatsData } = useTaskStatistics();
	const queryParams = useSearchParams();
	const $memberId = queryParams.get('memberId') || '';
	const params = useParams();
	console.log('paramsparams', $memberId);
	const memberId: string = useMemo(() => {
		return (params?.memberId ?? $memberId) as string;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [params]);

	const members = activeTeam?.members || [];

	const matchUser = members.find((m) => {
		return m.employee.userId === memberId;
	});

	const isAuthUser = auth?.employee?.userId === memberId;

	const activeUserTeamTask = isAuthUser ? activeTeamTask : matchUser?.lastWorkedTask;

	const userProfile = isAuthUser ? auth : matchUser?.employee.user;

	const employeeId = isAuthUser ? auth?.employee?.id : matchUser?.employeeId;

	/* Filtering the tasks */
	const tasksGrouped = useAuthTeamTasks(userProfile);

	useEffect(() => {
		if (employeeId) {
			getTasksStatsData(employeeId);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [employeeId]);

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
		assignTask
	};
}

export type I_UserProfilePage = ReturnType<typeof useUserProfilePage>;
