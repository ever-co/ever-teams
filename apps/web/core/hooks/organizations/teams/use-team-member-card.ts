'use client';
import { allTaskStatisticsState } from '@/core/stores';
import { getPublicState } from '@/core/stores/common/public';
import { ERoleName } from '@/core/types/generics/enums/role';
import { Nullable } from '@/core/types/generics/utils';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useAtomValue } from 'jotai';
import cloneDeep from 'lodash/cloneDeep';
import { useCallback, useMemo, useState } from 'react';
import { useAuthenticateUser } from '../../auth';
import { useOutsideClick } from '../../common';
import { useSyncRef } from '../../common/use-sync-ref';
import { useCurrentActiveTask } from './use-current-active-task';
import { useCurrentTeamTasks } from './use-current-team-tasks';
import { useDeleteEmployeeFromTasksMutation } from './use-delete-employee-from-tasks.mutation';
import { useGetOrganizationTeamQuery } from './use-get-organization-teams-query';
import { useSetActiveTask } from './use-set-active-task';
import { useIsMemberManager } from './use-team-member';
import { useUpdateOrganizationTeam } from './use-update-organization-team';
import { useUpdateTaskMutation } from './use-update-task.mutation';

/**
 * It returns a bunch of data about a team member, including whether or not the user is the team
 * manager, whether or not the user is the authenticated user, and the last task the user worked on
 * @param {IOrganizationTeam['members'][number] | undefined} member -
 * IOrganizationTeamList['members'][number] | undefined
 */
export function useTeamMemberCard(member: TOrganizationTeamEmployee | undefined) {
	const { setActiveTask } = useSetActiveTask();
	const { tasks } = useCurrentTeamTasks();
	const { mutateAsync: deleteEmployeeFromTasks } = useDeleteEmployeeFromTasksMutation();
	const { mutateAsync: updateTask } = useUpdateTaskMutation();

	const [assignTaskLoading, setAssignTaskLoading] = useState(false);
	const [unAssignTaskLoading, setUnAssignTaskLoading] = useState(false);
	const publicTeam = useAtomValue(getPublicState);
	const allTaskStatistics = useAtomValue(allTaskStatisticsState);

	const { user: authUser, isTeamManager: isAuthTeamManager } = useAuthenticateUser();

	const { task: activeTeamTask } = useCurrentActiveTask();

	const { data: activeTeamResult } = useGetOrganizationTeamQuery();
	const activeTeam = useMemo(() => activeTeamResult?.data ?? null, [activeTeamResult]);

	const { updateOrganizationTeam, loading: updateOTeamLoading } = useUpdateOrganizationTeam();

	const activeTeamRef = useSyncRef(activeTeam);

	const memberUser = member?.employee?.user;

	// const memberUserRef = useSyncRef(memberUser);
	const isAuthUser = member?.employee?.userId === authUser?.id;
	const { isTeamManager, isTeamCreator } = useIsMemberManager(memberUser);

	// NOTE_FIX: Use direct useMemo value instead of ref to trigger re-renders
	// When member.activeTaskId changes, we WANT UserTeamCard to re-render
	// to update TaskInfo with the new active task
	const memberTask = useMemo(() => {
		if (!member) {
			return null;
		}

		// For authenticated user, prioritize activeTeamTask (Jotai atom)
		// because it's updated instantly when changing tasks,
		// while member.activeTaskId waits for API response/React Query invalidation
		if (isAuthUser && activeTeamTask) {
			const responseTask = cloneDeep(activeTeamTask);
			const taskStatistics = allTaskStatistics.find((statistics) => statistics.id === responseTask.id);
			responseTask.totalWorkedTime = taskStatistics?.duration || 0;

			// NOTE: DO NOT set cookies here! This is a useMemo (pure computation).
			// Cookies are managed by setActiveTask in use-team-tasks.ts
			// Setting cookies here causes race conditions on page reload.

			return responseTask;
		}

		// For other members (or auth user with no activeTeamTask), use existing logic
		let cTask;
		let find;

		// Use member.activeTaskId from API for ALL members
		// This ensures each team has its own active task, not a global cookie
		let taskId: string | null = null;

		if (member.activeTaskId) {
			// Priority 1: activeTaskId from API (set when timer starts/stops or task is selected)
			taskId = member.activeTaskId;
		} else if (member.lastWorkedTask?.id) {
			// Priority 2: lastWorkedTask from API (last task user worked on)
			taskId = member.lastWorkedTask.id;
		}

		// Support for public teams: if publicTeam is true, allow any task to be displayed
		// Public teams are read-only and accessible without authentication via /team/[teamId]/[profileLink]
		if (taskId || publicTeam) {
			cTask = tasks.find((t) => t.id === taskId || publicTeam);
			find = publicTeam ? cTask : cTask?.members?.some((m) => m.id === member.employee?.id);
		}

		// Fallback: find any task assigned to the member
		if (!find) {
			cTask = tasks.find((t) => t.members?.some((m) => m.userId === member.employee?.userId));
			find = cTask?.members?.some((m) => m.id === member.employee?.id);
		}

		// NOTE: DO NOT set cookies here! This is a useMemo (pure computation).
		// Setting cookies in useMemo is an anti-pattern and causes race conditions.

		const responseTask = find ? cloneDeep(cTask) : null;

		if (responseTask) {
			const taskStatistics = allTaskStatistics.find((statistics) => statistics.id === responseTask.id);
			responseTask.totalWorkedTime = taskStatistics?.duration || 0;
		}

		return responseTask;
	}, [
		isAuthUser,
		activeTeamTask,
		member,
		member?.activeTaskId, // Force recalculation when activeTaskId changes
		member?.lastWorkedTask?.id, // Force recalculation when lastWorkedTask changes
		tasks,
		publicTeam,
		allTaskStatistics
	]);

	/**
	 * Give the manager role to the member
	 */
	const makeMemberManager = useCallback(() => {
		const employeeId = member?.employee?.id;

		if (!activeTeamRef.current || !employeeId) return;

		const team = activeTeamRef.current;
		const managerIdSet = new Set<string>();
		const memberIdSet = new Set<string>();

		for (const member of team.members || []) {
			if (member.employee?.id && member.role?.name === ERoleName.MANAGER) {
				managerIdSet.add(member.employee.id);
			} else {
				memberIdSet.add(member.employee?.id);
			}
		}

		managerIdSet.add(employeeId); // add new employeeId if not already present

		updateOrganizationTeam(team, {
			managerIds: Array.from(managerIdSet),
			memberIds: Array.from(memberIdSet)
		});
	}, [updateOrganizationTeam, member, activeTeamRef]);

	/**
	 * remove manager role to the member
	 */
	const unMakeMemberManager = useCallback(() => {
		const employeeId = member?.employee?.id;

		if (!activeTeamRef.current || !employeeId) return;

		const team = activeTeamRef.current;
		const managerIdSet = new Set<string>();
		const memberIdSet = new Set<string>();

		for (const member of team.members || []) {
			if (member.employee?.id && member.employee.id !== employeeId && member.role?.name === ERoleName.MANAGER) {
				managerIdSet.add(member.employee.id);
			} else {
				memberIdSet.add(member.employee?.id);
			}
		}

		updateOrganizationTeam(team, {
			managerIds: Array.from(managerIdSet),
			memberIds: Array.from(memberIdSet)
		});
	}, [updateOrganizationTeam, member, activeTeamRef]);

	/**
	 * Remove member from team API call
	 */
	const removeMemberFromTeam = useCallback(() => {
		const employeeId = member?.employee?.id;
		if (!activeTeamRef.current || !employeeId) return;

		const team = activeTeamRef.current;
		const memberIdSet = new Set<string>();
		const managerIdSet = new Set<string>();

		for (const member of team.members || []) {
			const id = member.employee?.id;
			if (!id || id === employeeId) continue;

			memberIdSet.add(id);
			if (member.role?.name === ERoleName.MANAGER) {
				managerIdSet.add(id);
			}
		}

		deleteEmployeeFromTasks(employeeId);
		updateOrganizationTeam(team, {
			memberIds: Array.from(memberIdSet),
			managerIds: Array.from(managerIdSet)
		});
	}, [updateOrganizationTeam, member, activeTeamRef, deleteEmployeeFromTasks]);

	/**
	 * Returns all tasks not assigned to the member
	 */
	const memberUnassignTasks = useMemo(() => {
		if (!memberUser) return [];

		return tasks.filter((task) => {
			return !task.members?.some((m) => m.userId === memberUser.id);
		});
	}, [tasks, memberUser]);

	/**
	 * Assign task to the member
	 */
	const assignTask = useCallback(
		(task: TTask) => {
			if (!member?.employeeId) {
				return Promise.resolve();
			}
			setAssignTaskLoading(true);
			return updateTask({
				taskId: task?.id,
				taskData: { ...task, members: [...(task.members || []), (member ? member : {}) as any] }
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
		(task: TTask) => {
			if (!member?.employeeId) {
				return Promise.resolve();
			}
			setUnAssignTaskLoading(true);

			return updateTask({
				taskId: task?.id,
				taskData: { ...task, members: task.members?.filter((m) => m.id !== member.employeeId) }
			}).finally(() => {
				isAuthUser && setActiveTask(null);
				setUnAssignTaskLoading(false);
			});
		},
		[updateTask, member, isAuthUser, setActiveTask]
	);

	return {
		assignTask,
		memberUnassignTasks,
		isTeamManager,
		memberUser,
		assignTaskLoading,
		unAssignTaskLoading,
		member,
		memberTask,
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

export function useTMCardTaskEdit(task: Nullable<TTask>) {
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
