'use client';

import { getActiveTaskIdCookie, setActiveTaskIdCookie, setActiveUserTaskCookie } from '@/core/lib/helpers/index';
import { IOrganizationTeamList, ITeamTask, Nullable } from '@/core/types/interfaces';
import { activeTeamTaskState, allTaskStatisticsState } from '@/core/stores';
import { getPublicState } from '@/core/stores/public';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useOutsideClick } from '../useOutsideClick';
import { useSyncRef } from '../useSyncRef';
import { useAuthenticateUser } from './useAuthenticateUser';
import { useOrganizationTeams } from './useOrganizationTeams';
import { useIsMemberManager } from './useTeamMember';
import { useTeamTasks } from './useTeamTasks';
import cloneDeep from 'lodash/cloneDeep';

/**
 * It returns a bunch of data about a team member, including whether or not the user is the team
 * manager, whether or not the user is the authenticated user, and the last task the user worked on
 * @param {IOrganizationTeamList['members'][number] | undefined} member -
 * IOrganizationTeamList['members'][number] | undefined
 */
export function useTeamMemberCard(member: IOrganizationTeamList['members'][number] | undefined) {
	const { updateTask, tasks, setActiveTask, deleteEmployeeFromTasks, unassignAuthActiveTask } = useTeamTasks();
	const [assignTaskLoading, setAssignTaskLoading] = useState(false);
	const [unAssignTaskLoading, setUnAssignTaskLoading] = useState(false);
	const publicTeam = useAtomValue(getPublicState);
	const allTaskStatistics = useAtomValue(allTaskStatisticsState);

	const { user: authUser, isTeamManager: isAuthTeamManager } = useAuthenticateUser();

	const activeTeamTask = useAtomValue(activeTeamTaskState);

	const { activeTeam, updateOrganizationTeam, updateOTeamLoading } = useOrganizationTeams();

	const activeTeamRef = useSyncRef(activeTeam);

	const memberUser = member?.employee.user;

	// const memberUserRef = useSyncRef(memberUser);
	const isAuthUser = member?.employee.userId === authUser?.id;
	const { isTeamManager, isTeamCreator } = useIsMemberManager(memberUser);

	const memberTaskRef = useRef<Nullable<ITeamTask>>(null);

	const setActiveUserTaskCookieCb = useCallback(
		(task: ITeamTask | null) => {
			if (task?.id && authUser?.id) {
				setActiveUserTaskCookie({
					taskId: task.id,
					userId: authUser.id
				});
				setActiveTaskIdCookie(task.id);
			}
		},
		[authUser]
	);

	memberTaskRef.current = useMemo(() => {
		let cTask;
		let find;

		if (!member) {
			return null;
		}
		const active_task_id = getActiveTaskIdCookie();

		if (active_task_id && isAuthUser) {
			cTask = tasks.find((t) => active_task_id === t.id || publicTeam);
			find = cTask;
		} else if (member.lastWorkedTask) {
			cTask = tasks.find((t) => t.id === member.lastWorkedTask?.id);
			find = cTask?.members.some((m) => m.id === member.employee.id);
		} else {
			cTask = tasks.find((t) => t.members.some((m) => m.userId === member.employee.userId));
			find = cTask?.members.some((m) => m.id === member.employee.id);
		}

		if (isAuthUser && member.lastWorkedTask && !active_task_id) {
			setActiveUserTaskCookieCb(member.lastWorkedTask);
		} else if (isAuthUser && find && cTask && !active_task_id) {
			setActiveUserTaskCookieCb(cTask);
		}

		const responseTask = find ? cloneDeep(cTask) : null;

		if (responseTask) {
			const taskStatistics = allTaskStatistics.find((statistics) => statistics.id === responseTask.id);
			responseTask.totalWorkedTime = taskStatistics?.duration || 0;
		}

		return responseTask;
	}, [isAuthUser, member, tasks, publicTeam, allTaskStatistics, setActiveUserTaskCookieCb]);

	/**
	 * Give the manager role to the member
	 */
	const makeMemberManager = useCallback(() => {
		const employeeId = member?.employee?.id;

		if (!activeTeamRef.current || !employeeId) return;
		const team = activeTeamRef.current;

		updateOrganizationTeam(activeTeamRef.current, {
			managerIds: team.members
				.filter((r) => r.role && r.role.name === 'MANAGER')
				.map((r) => r.employee.id)
				.concat(employeeId)
		});
	}, [updateOrganizationTeam, member, activeTeamRef]);

	/**
	 * remove manager role to the member
	 */
	const unMakeMemberManager = useCallback(() => {
		const employeeId = member?.employee?.id;

		if (!activeTeamRef.current || !employeeId) return;
		const team = activeTeamRef.current;

		updateOrganizationTeam(activeTeamRef.current, {
			managerIds: team.members
				.filter((r) => r.role && r.role.name === 'MANAGER')
				.filter((r) => r.employee.id !== employeeId)
				.map((r) => r.employee.id)
				.filter((value, index, array) => array.indexOf(value) === index) // To make the array Unique list of ids
		});
	}, [updateOrganizationTeam, member, activeTeamRef]);

	/**
	 * Remove member from team API call
	 */
	const removeMemberFromTeam = useCallback(() => {
		const employeeId = member?.employee?.id;

		if (!activeTeamRef.current || !employeeId) return;
		const team = activeTeamRef.current;

		deleteEmployeeFromTasks(employeeId, team.id); // Unassign all the task
		updateOrganizationTeam(activeTeamRef.current, {
			// remove from members
			memberIds: team.members.filter((r) => r.employee.id !== employeeId).map((r) => r.employee.id),

			// remove from managers
			managerIds: team.members
				.filter((r) => r.role && r.role.name === 'MANAGER')
				.filter((r) => r.employee.id !== employeeId)
				.map((r) => r.employee.id)
		});
	}, [updateOrganizationTeam, member, activeTeamRef, deleteEmployeeFromTasks]);

	/**
	 * Returns all tasks not assigned to the member
	 */
	const memberUnassignTasks = useMemo(() => {
		if (!memberUser) return [];

		return tasks.filter((task) => {
			return !task.members.some((m) => m.userId === memberUser.id);
		});
	}, [tasks, memberUser]);

	/**
	 * Assign task to the member
	 */
	const assignTask = useCallback(
		(task: ITeamTask) => {
			if (!member?.employeeId) {
				return Promise.resolve();
			}
			setAssignTaskLoading(true);
			return updateTask({
				...task,
				members: [...task.members, (member?.employeeId ? { id: member?.employeeId } : {}) as any]
			}).then(() => {
				if (isAuthUser && !activeTeamTask) {
					setActiveTask(task);
				}
				setAssignTaskLoading(false);
			});
		},
		[updateTask, member, isAuthUser, setActiveTask, activeTeamTask]
	);

	const unassignTask = useCallback(
		(task: ITeamTask) => {
			if (!member?.employeeId) {
				return Promise.resolve();
			}
			setUnAssignTaskLoading(true);

			return updateTask({
				...task,
				members: task.members.filter((m) => m.id !== member.employeeId)
			}).finally(() => {
				isAuthUser && unassignAuthActiveTask();
				setUnAssignTaskLoading(false);
			});
		},
		[updateTask, member, isAuthUser, unassignAuthActiveTask]
	);

	return {
		assignTask,
		memberUnassignTasks,
		isTeamManager,
		memberUser,
		assignTaskLoading,
		unAssignTaskLoading,
		member,
		memberTask: memberTaskRef.current,
		isAuthUser,
		isAuthTeamManager,
		makeMemberManager,
		updateOTeamLoading,
		removeMemberFromTeam,
		unMakeMemberManager,
		isTeamCreator,
		unassignTask,
		isTeamOwner: activeTeam?.createdByUser?.id === memberUser?.id
	};
}

export function useTMCardTaskEdit(task: Nullable<ITeamTask>) {
	const [editMode, setEditMode] = useState(false);
	const [estimateEditMode, setEstimateEditMode] = useState(false);
	const [loading, setLoading] = useState(false);

	const estimateEditIgnoreElement = useOutsideClick<any>();
	const taskEditIgnoreElement = useOutsideClick<any>();

	return {
		editMode,
		setEditMode,
		task,
		estimateEditMode,
		setEstimateEditMode,
		estimateEditIgnoreElement,
		taskEditIgnoreElement,
		loading,
		setLoading
	};
}

export type I_TMCardTaskEditHook = ReturnType<typeof useTMCardTaskEdit>;

export type I_TeamMemberCardHook = ReturnType<typeof useTeamMemberCard>;
