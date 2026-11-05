'use client';
import { activeTeamTaskState, tasksByTeamState } from '@/core/stores';
import { useCallback, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useUpdateTask } from './use-update-task';
import { useDeleteTask } from './use-delete-task';
import { useSetActiveTask } from './use-team-tasks-state';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useUserQuery } from '../../queries/user-user.query';

/**
 * Provides task assignment/unassignment mutations for a given team member.
 *
 * Handles:
 * - assignTask: assigns a task to the member (and sets it as active if auth user has no active task)
 * - unassignTask: removes the member from a task (and clears the auth user's active task when it was that task)
 * - memberUnassignTasks: list of tasks NOT assigned to the member (for the assign dropdown)
 * - assignTaskLoading / unAssignTaskLoading: loading states for UI feedback
 *
 * @param member - The team member to manage task assignments for
 */
export function useTeamMemberMutations(member: TOrganizationTeamEmployee | undefined) {
	const { data: authUser } = useUserQuery();
	const { updateTask } = useUpdateTask();
	const { unassignAuthActiveTask } = useDeleteTask();
	const { setActiveTask } = useSetActiveTask();
	const tasks = useAtomValue(tasksByTeamState);
	const activeTeamTask = useAtomValue(activeTeamTaskState);

	const [assignTaskLoading, setAssignTaskLoading] = useState(false);
	const [unAssignTaskLoading, setUnAssignTaskLoading] = useState(false);

	const isAuthUser = !!member?.employee?.userId && member.employee.userId === authUser?.id;
	const memberUser = member?.employee?.user;

	/**
	 * Returns all tasks not assigned to the member (used for the assign dropdown)
	 */
	const memberUnassignTasks = useMemo(() => {
		if (!memberUser) return [];

		return tasks.filter((task) => {
			return !task.members?.some((m) => m.userId === memberUser.id);
		});
	}, [tasks, memberUser]);

	/**
	 * Assign a task to the member.
	 * If the auth user has no active task, also sets this task as the active task.
	 * Resolves to whether the assignment was sent: a member without an employee record cannot be assigned.
	 */
	const assignTask = useCallback(
		(task: TTask): Promise<boolean> => {
			if (!member?.employeeId) {
				return Promise.resolve(false);
			}
			setAssignTaskLoading(true);
			return updateTask({
				...task,
				members: [...(task.members || []), (member ? member : {}) as any]
			})
				.then(() => {
					if (isAuthUser && !activeTeamTask) {
						setActiveTask(task);
					}
					return true;
				})
				.finally(() => {
					setAssignTaskLoading(false);
				});
		},
		[updateTask, member, isAuthUser, setActiveTask, activeTeamTask]
	);

	/**
	 * Unassign a task from the member.
	 * When the auth user leaves the very task they have active, that active task is cleared; leaving another task
	 * leaves the active one, and its timer, as they are.
	 */
	const unassignTask = useCallback(
		(task: TTask) => {
			if (!member?.employeeId) {
				return Promise.resolve();
			}
			setUnAssignTaskLoading(true);

			return updateTask({
				...task,
				members: task.members?.filter((m) => m.id !== member.employeeId)
			})
				.then(() => {
					const isActiveTask = activeTeamTask?.id === task.id;
					const leavesOwnActiveTask = isAuthUser && isActiveTask;
					if (leavesOwnActiveTask) {
						unassignAuthActiveTask();
					}
				})
				.finally(() => {
					setUnAssignTaskLoading(false);
				});
		},
		[updateTask, member, isAuthUser, activeTeamTask, unassignAuthActiveTask]
	);

	return {
		assignTask,
		unassignTask,
		assignTaskLoading,
		unAssignTaskLoading,
		memberUnassignTasks
	};
}

export type I_TeamMemberMutationsHook = ReturnType<typeof useTeamMemberMutations>;
