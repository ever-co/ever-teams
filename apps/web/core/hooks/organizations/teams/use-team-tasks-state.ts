'use client';

import {
	getActiveTaskIdCookie,
	getActiveUserTaskCookie,
	setActiveTaskIdCookie,
	setActiveUserTaskCookie
} from '@/core/lib/helpers/index';
import { getValidActiveTask } from '@/core/lib/utils/task.utils';
import { logErrorInDev } from '@/core/lib/helpers/error-message';
import {
	activeTeamState,
	activeTeamTaskState,
	memberActiveTaskIdState,
	tasksByTeamState,
	teamTasksCompleteState,
	teamTasksState
} from '@/core/stores';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAtomValue, useSetAtom, useStore } from 'jotai';
import isEqual from 'lodash/isEqual';
import { useUpdateEmployeeActiveTask } from './use-organization-teams-employee';
import { useConditionalUpdateEffect } from '../../common/use-has-mounted';
import { useSyncRef } from '../../common/use-sync-ref';
import { TOrganizationTeamEmployee, TUser } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useUserQuery } from '../../queries/user-user.query';
import { useUpdateTask } from './use-update-task';

type ActiveUserTaskCookieValue = { taskId: string; userId: string };

const NO_ACTIVE_USER_TASK: ActiveUserTaskCookieValue = { taskId: '', userId: '' };

function activeUserTaskCookieValue(task: TTask | null, userId: string | undefined): ActiveUserTaskCookieValue {
	const taskId = task?.id;
	if (taskId && userId) {
		return { taskId, userId };
	}
	return NO_ACTIVE_USER_TASK;
}

// The server sync effect runs in every mounted instance on each team or task list update, so a cookie that already
// holds the value is not written again: each write is serialized and goes through the browser's cookie store.
function syncActiveTaskIdCookie(taskId: string) {
	const isUnchanged = getActiveTaskIdCookie() === taskId;
	if (isUnchanged) {
		return;
	}
	setActiveTaskIdCookie(taskId);
}

function syncActiveUserTaskCookie(value: ActiveUserTaskCookieValue) {
	const current = getActiveUserTaskCookie();
	const isSameTask = current?.taskId === value.taskId;
	const isSameUser = current?.userId === value.userId;
	const isUnchanged = isSameTask && isSameUser;
	if (isUnchanged) {
		return;
	}
	setActiveUserTaskCookie(value);
}

type JotaiStore = ReturnType<typeof useStore>;

// A task list write rebuilds the task objects: an active task whose data did not change keeps its object, so the
// readers of the active task do not re-render after every task list refresh.
function setActiveTeamTaskIfChanged(store: JotaiStore, task: TTask | null) {
	const current = store.get(activeTeamTaskState);
	const isUnchanged = isEqual(current, task);
	if (isUnchanged) {
		return;
	}
	store.set(activeTeamTaskState, task);
}

/** The signed-in user as last loaded: kept while the user query refetches or briefly has no data. */
function useLastAuthUser() {
	const { data: userData } = useUserQuery();
	const lastUserRef = useRef<TUser | null>(userData ?? null);
	useEffect(() => {
		if (userData) {
			lastUserRef.current = userData;
		}
	}, [userData]);
	return { authUser: userData, lastUserRef };
}

/**
 * setActiveTask and its local guard, without the server sync effects. The team, the tasks and the member's active
 * task id are read when the call runs, so the component holding it does not re-render on their refreshes.
 */
function useActiveTaskSetter() {
	const store = useStore();
	const { updateOrganizationTeamEmployeeActiveTask } = useUpdateEmployeeActiveTask();
	const { updateTask } = useUpdateTask();
	const { authUser, lastUserRef } = useLastAuthUser();
	const authUserRef = useSyncRef(authUser);
	const setActiveTeamTask = useSetAtom(activeTeamTaskState);
	const [isUpdatingActiveTask, setIsUpdatingActiveTask] = useState(false);

	// Track expected task ID to prevent stale server data from overwriting local selection.
	const expectedActiveTaskIdRef = useRef<string | null>(null);

	const setActiveUserTaskCookieCb = useCallback(
		(task: TTask | null) => {
			setActiveUserTaskCookie(activeUserTaskCookieValue(task, authUserRef.current?.id));
		},
		[authUserRef]
	);

	/**
	 * Change active task with server synchronization
	 */
	const setActiveTask = useCallback(
		async (task: TTask | null) => {
			// Set flag to prevent race conditions with server sync
			setIsUpdatingActiveTask(true);

			try {
				const memberActiveTaskId = store.get(memberActiveTaskIdState);
				const signedInUser = lastUserRef.current;
				/**
				 * Unassign previous active task
				 */
				if (memberActiveTaskId && signedInUser && memberActiveTaskId !== task?.id) {
					const _task = store.get(tasksByTeamState).find((t) => t.id === memberActiveTaskId);

					if (_task) {
						try {
							await updateTask({
								..._task,
								members: _task.members?.filter((m) => m.id !== signedInUser.employee?.id)
							});
						} catch (error) {
							logErrorInDev('[setActiveTask] Failed to unassign previous task', error);
							// Continue execution - do not block switching to new task
						}
					}
				}

				const previousTask = store.get(activeTeamTaskState);
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
							const activeTeam = store.get(activeTeamState);
							const currentEmployeeDetails = activeTeam?.members?.find(
								(member: TOrganizationTeamEmployee) =>
									member.employeeId === authUserRef.current?.employee?.id
							);

							if (currentEmployeeDetails?.id) {
								await updateOrganizationTeamEmployeeActiveTask(currentEmployeeDetails.id, {
									organizationId: task.organizationId,
									activeTaskId: task.id,
									organizationTeamId: activeTeam?.id,
									tenantId: activeTeam?.tenantId ?? ''
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

							// Rollback on retry exhaustion
							expectedActiveTaskIdRef.current = previousTaskId || null;
							setActiveTaskIdCookie(previousTaskId || '');
							setActiveTeamTask(previousTask);
							setActiveUserTaskCookieCb(previousTask);
						}

						if (success) {
							// The sync effect clears the expectation once the server echoes this id. This is only
							// the fallback, and it is not awaited because the timer start waits for this function.
							setTimeout(() => {
								if (expectedActiveTaskIdRef.current === task.id) {
									expectedActiveTaskIdRef.current = null;
								}
							}, 600);
						}
					} catch (error) {
						// useUpdateEmployeeActiveTask already told the user
						logErrorInDev('[setActiveTask] API call failed:', error);

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
			store,
			setActiveTeamTask,
			setActiveUserTaskCookieCb,
			updateOrganizationTeamEmployeeActiveTask,
			authUserRef,
			lastUserRef,
			updateTask
		]
	);

	return { setActiveTask, isUpdatingActiveTask, expectedActiveTaskIdRef, authUserRef, store };
}

/**
 * Sets the active task, for components rendered once per member or task. The server sync effects of
 * useTeamTasksState run in the shell's own instance (the timer owner in InitState, mounted on every page), so this
 * hook does not repeat them and does not re-render its component on team or task list refreshes.
 */
export function useSetActiveTask() {
	const { setActiveTask, isUpdatingActiveTask } = useActiveTaskSetter();
	return { setActiveTask, isUpdatingActiveTask };
}

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
	const { setActiveTask, isUpdatingActiveTask, expectedActiveTaskIdRef, authUserRef, store } = useActiveTaskSetter();

	const setAllTasks = useSetAtom(teamTasksState);
	const tasks = useAtomValue(tasksByTeamState);
	const tasksComplete = useAtomValue(teamTasksCompleteState);
	const memberActiveTaskId = useAtomValue(memberActiveTaskIdState);
	const activeTeam = useAtomValue(activeTeamState);
	const activeTeamTask = useAtomValue(activeTeamTaskState);

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
				setActiveTeamTaskIfChanged(store, memberActiveTask);
				// Both cookies follow the atom here too, as in setActiveTask: the server guards and the fallback
				// routes read the task id one, and the hydration effect below prefers the user one, so leaving
				// either behind brings the old task back on the next task-list refresh.
				syncActiveTaskIdCookie(memberActiveTask.id);
				syncActiveUserTaskCookie(activeUserTaskCookieValue(memberActiveTask, authUserRef.current?.id));
			} else if (memberActiveTaskId && activeTeam?.id && tasksComplete) {
				setActiveTeamTaskIfChanged(store, null);
				syncActiveTaskIdCookie('');
				syncActiveUserTaskCookie(NO_ACTIVE_USER_TASK);
			}
		},
		[activeTeam, tasks, tasksComplete, memberActiveTaskId, isUpdatingActiveTask],
		true
	);

	// Get the active task from cookie and put on global store
	useConditionalUpdateEffect(
		() => {
			const active_user_task = getActiveUserTaskCookie();
			const active_taskid =
				active_user_task?.userId === authUserRef.current?.id
					? active_user_task?.taskId
					: getActiveTaskIdCookie() || '';

			const validTask = getValidActiveTask(tasks, active_taskid, activeTeam?.id);
			if (validTask || tasksComplete) {
				setActiveTeamTaskIfChanged(store, validTask);
			}
		},
		[tasks, tasksComplete, authUserRef, activeTeam?.id],
		Boolean(activeTeamTask)
	);

	return {
		setActiveTask,
		setAllTasks,
		isUpdatingActiveTask,
		activeTeamTask
	};
}
