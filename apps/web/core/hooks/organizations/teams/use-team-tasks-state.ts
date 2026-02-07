'use client';

import {
	getActiveTaskIdCookie,
	getActiveUserTaskCookie,
	setActiveTaskIdCookie,
	setActiveUserTaskCookie
} from '@/core/lib/helpers/index';
import { getValidActiveTask } from '@/core/lib/utils/task.utils';
import { getErrorMessage, logErrorInDev } from '@/core/lib/helpers/error-message';
import {
	activeTeamState,
	activeTeamTaskState,
	memberActiveTaskIdState,
	tasksByTeamState,
	teamTasksState
} from '@/core/stores';
import { useCallback, useRef, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useOrganizationEmployeeTeams } from './use-organization-teams-employee';
import { useAuthenticateUser } from '../../auth';
import { useConditionalUpdateEffect, useSyncRef } from '../../common';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useUserQuery } from '../../queries/user-user.query';
import { toast } from 'sonner';
import { useUpdateTask } from './use-update-task';

/**
 * Hook for team tasks state management (active task operations).
 *
 * This hook provides:
 * - Set active task with server sync
 * - Race condition protection
 * - Cookie management
 * - Multi-device synchronization
 *
 * @returns Object containing:
 * - `setActiveTask` - Function to set and sync active task
 * - `setAllTasks` - Function to update all tasks in state
 * - `isUpdatingActiveTask` - Flag indicating active task update in progress
 * - `activeTeamTask` - Currently active task
 */
export function useTeamTasksState() {
	const { updateOrganizationTeamEmployeeActiveTask } = useOrganizationEmployeeTeams();
	const { $user } = useAuthenticateUser();
	const { updateTask } = useUpdateTask();

	const setAllTasks = useSetAtom(teamTasksState);
	const tasks = useAtomValue(tasksByTeamState);
	const tasksRef = useSyncRef(tasks);
	const { data: userData } = useUserQuery();
	const authUser = useSyncRef(userData);
	const memberActiveTaskId = useAtomValue(memberActiveTaskIdState);
	const $memberActiveTaskId = useSyncRef(memberActiveTaskId);
	const activeTeam = useAtomValue(activeTeamState);
	const activeTeamRef = useSyncRef(activeTeam);
	const [activeTeamTask, setActiveTeamTask] = useAtom(activeTeamTaskState);
	const [isUpdatingActiveTask, setIsUpdatingActiveTask] = useState(false);

	// Keep activeTeamTask in sync with a ref to avoid stale closures in setActiveTask
	const activeTeamTaskRef = useSyncRef(activeTeamTask);

	// Track expected task ID to prevent stale server data from overwriting local selection.
	const expectedActiveTaskIdRef = useRef<string | null>(null);

	const setActiveUserTaskCookieCb = useCallback(
		(task: TTask | null) => {
			if (task?.id && authUser.current?.id) {
				setActiveUserTaskCookie({
					taskId: task?.id,
					userId: authUser.current?.id
				});
			} else {
				setActiveUserTaskCookie({
					taskId: '',
					userId: ''
				});
			}
		},
		[authUser]
	);

	/**
	 * Change active task with server synchronization
	 */
	const setActiveTask = useCallback(
		async (task: TTask | null) => {
			// Set flag to prevent race conditions with server sync
			setIsUpdatingActiveTask(true);

			try {
				/**
				 * Unassign previous active task
				 */
				if ($memberActiveTaskId.current && $user.current) {
					const _task = tasksRef.current.find((t) => t.id === $memberActiveTaskId.current);

					if (_task) {
						await updateTask({
							..._task,
							members: _task.members?.filter((m) => m.id !== $user.current?.employee?.id)
						});
					}
				}

				// Use ref to get current activeTeamTask to avoid stale closure
				const previousTask = activeTeamTaskRef.current;
				const previousTaskId = getActiveTaskIdCookie();

				// Set expected task ID BEFORE updating state/cookies.
				expectedActiveTaskIdRef.current = task?.id || null;

				setActiveTaskIdCookie(task?.id || '');
				setActiveTeamTask(task);
				setActiveUserTaskCookieCb(task);

				if (task) {
					/**
					 * Sync active task to server for multi-device support.
					 * Retry up to 3 times because activeTeam.members may not be loaded yet on first render.
					 */
					const MAX_RETRIES = 3;
					const RETRY_DELAY_MS = 500;

					try {
						let success = false;

						for (let attempt = 1; attempt <= MAX_RETRIES && !success; attempt++) {
							const currentEmployeeDetails = activeTeamRef.current?.members?.find(
								(member: TOrganizationTeamEmployee) =>
									member.employeeId === authUser.current?.employee?.id
							);

							if (currentEmployeeDetails?.id) {
								await updateOrganizationTeamEmployeeActiveTask(currentEmployeeDetails.id, {
									organizationId: task.organizationId,
									activeTaskId: task.id,
									organizationTeamId: activeTeamRef.current?.id,
									tenantId: activeTeamRef.current?.tenantId ?? ''
								});
								success = true;
							} else if (attempt < MAX_RETRIES) {
								await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
							}
						}

						if (!success) {
							logErrorInDev(
								'[setActiveTask] Failed to sync after retries - members may not be loaded',
								null
							);
							expectedActiveTaskIdRef.current = null;
						}

						if (success) {
							toast.success('Active task updated', {
								description: `"${task.title}" is now your active task`
							});

							// Short delay to let React Query stabilize
							await new Promise((resolve) => setTimeout(resolve, 600));
							expectedActiveTaskIdRef.current = null;
						}
					} catch (error) {
						logErrorInDev('[setActiveTask] API call failed:', error);
						toast.error('Failed to update active task', {
							description: getErrorMessage(error)
						});
						// Rollback: restore previous state
						expectedActiveTaskIdRef.current = previousTaskId || null;
						setActiveTaskIdCookie(previousTaskId || '');
						setActiveTeamTask(previousTask);
						setActiveUserTaskCookieCb(previousTask);
					}
				}
			} finally {
				setIsUpdatingActiveTask(false);
			}
		},
		[
			setActiveTeamTask,
			setActiveUserTaskCookieCb,
			updateOrganizationTeamEmployeeActiveTask,
			activeTeamRef,
			authUser,
			$memberActiveTaskId,
			$user,
			tasksRef,
			updateTask,
			activeTeamTaskRef
		]
	);

	// Sync active task from server (multi-device sync)
	useConditionalUpdateEffect(
		() => {
			if (isUpdatingActiveTask) {
				return;
			}

			if (expectedActiveTaskIdRef.current) {
				if (memberActiveTaskId === expectedActiveTaskIdRef.current) {
					expectedActiveTaskIdRef.current = null;
				}
				return;
			}

			const memberActiveTask = getValidActiveTask(tasks, memberActiveTaskId, activeTeam?.id);
			if (memberActiveTask) {
				setActiveTeamTask(memberActiveTask);
			} else if (memberActiveTaskId && activeTeam?.id) {
				setActiveTeamTask(null);
			}
		},
		[activeTeam, tasks, memberActiveTaskId, isUpdatingActiveTask],
		true
	);

	// Get the active task from cookie and put on global store
	useConditionalUpdateEffect(
		() => {
			const active_user_task = getActiveUserTaskCookie();
			const active_taskid =
				active_user_task?.userId === authUser.current?.id
					? active_user_task?.taskId
					: getActiveTaskIdCookie() || '';

			const validTask = getValidActiveTask(tasks, active_taskid, activeTeam?.id);
			setActiveTeamTask(validTask);
		},
		[tasks, authUser, activeTeam?.id],
		Boolean(activeTeamTask)
	);

	return {
		setActiveTask,
		setAllTasks,
		isUpdatingActiveTask,
		activeTeamTask
	};
}
