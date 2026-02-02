import { getActiveTaskIdCookie, setActiveTaskIdCookie, setActiveUserTaskCookie } from '@/core/lib/helpers/cookies';
import { getErrorMessage, logErrorInDev } from '@/core/lib/helpers/error-message';
import { activeTeamState, activeTeamTaskState, memberActiveTaskIdState } from '@/core/stores';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useAtom, useAtomValue } from 'jotai';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuthenticateUser } from '../../auth';
import { useConditionalUpdateEffect, useSyncRef } from '../../common';
import { useOrganizationEmployeeTeams } from '../../organizations';
import { useUpdateTaskMutation } from '../mutations/use-update-task.mutation';
import { useSortedTasks } from '../derived/use-current-team-tasks';

export const useSetActiveTask = () => {
	const { mutateAsync: updateTask } = useUpdateTaskMutation();
	const tasks = useSortedTasks();
	const tasksRef = useSyncRef(tasks);

	const { updateOrganizationTeamEmployeeActiveTask } = useOrganizationEmployeeTeams();

	const activeTeam = useAtomValue(activeTeamState);
	const activeTeamRef = useSyncRef(activeTeam);

	const memberActiveTaskId = useAtomValue(memberActiveTaskIdState);
	const $memberActiveTaskId = useSyncRef(memberActiveTaskId);

	const { $user } = useAuthenticateUser();

	const [activeTeamTask, setActiveTeamTask] = useAtom(activeTeamTaskState);
	// Keep activeTeamTask in sync with a ref to avoid stale closures in setActiveTask
	const activeTeamTaskRef = useSyncRef(activeTeamTask);

	// Track expected task ID to prevent stale server data from overwriting local selection.
	// When user selects a task, we store its ID here. The sync effect will skip updates
	// until server data matches this expected ID (confirming our selection was persisted).
	const expectedActiveTaskIdRef = useRef<string | null>(null);

	const [isUpdatingActiveTask, setIsUpdatingActiveTask] = useState(false);

	const setActiveUserTaskCookieCb = useCallback(
		(task: TTask | null) => {
			if (task?.id && $user?.current?.id) {
				setActiveUserTaskCookie({
					taskId: task?.id,
					userId: $user?.current?.id
				});
			} else {
				setActiveUserTaskCookie({
					taskId: '',
					userId: ''
				});
			}
		},
		[$user?.current?.id]
	);

	const setActiveTask = useCallback(
		async (task: TTask | null) => {
			// Set flag to prevent race conditions with server sync
			setIsUpdatingActiveTask(true);

			try {
				/**
				 * Unassign previous active task
				 */
				if ($memberActiveTaskId.current && $user.current) {
					const _task = (tasks ?? []).find((t) => t.id === $memberActiveTaskId.current);

					if (_task) {
						await updateTask({
							taskId: _task.id,
							taskData: {
								..._task,
								members: _task.members?.filter((m) => m.id !== $user.current?.employee?.id)
							}
						});
					}
				}

				// Use ref to get current activeTeamTask to avoid stale closure
				const previousTask = activeTeamTaskRef?.current;
				const previousTaskId = activeTeamTaskRef?.current?.id ?? getActiveTaskIdCookie();

				// Set expected task ID BEFORE updating state/cookies.
				// This prevents the sync effect from overwriting with stale server data.
				expectedActiveTaskIdRef.current = task?.id || null;

				setActiveTaskIdCookie(task?.id || '');
				setActiveTeamTask(task);
				setActiveUserTaskCookieCb(task);

				if (task) {
					/**
					 * Sync active task to server for multi-device support.
					 * Cookies are already set above, so local persistence works even if API fails.
					 * Retry up to 3 times because activeTeam.members may not be loaded yet on first render.
					 */
					const MAX_RETRIES = 3;
					const RETRY_DELAY_MS = 500;

					try {
						let success = false;

						// Use activeTeamRef.current to get fresh values on each retry attempt.
						// Using activeTeam directly would capture the stale closure value.
						for (let attempt = 1; attempt <= MAX_RETRIES && !success; attempt++) {
							const currentEmployeeDetails = activeTeamRef.current?.members?.find(
								(member: TOrganizationTeamEmployee) => member.employeeId === $user.current?.employee?.id
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
							// All retries exhausted - members may not be loaded yet.
							// Local state (cookies + Jotai) is already persisted, only server sync failed.
							logErrorInDev(
								'[setActiveTask] Failed to sync after retries - members may not be loaded',
								null
							);
							// Clear expected ID to allow server sync to resume
							expectedActiveTaskIdRef.current = null;
						}

						if (success) {
							toast.success('Active task updated', {
								description: `"${task.title}" is now your active task`
							});

							// Short delay to let React Query stabilize before clearing isUpdatingActiveTask.
							// The expectedActiveTaskIdRef provides the main protection against stale data,
							// this delay is just an extra safety buffer for edge cases.
							// NOTE: Do NOT invalidate queries here - updateActiveTaskMutation already handles it.
							await new Promise((resolve) => setTimeout(resolve, 600));
							// Clear expectation on success - server will confirm via sync effect
							expectedActiveTaskIdRef.current = null;
						}
					} catch (error) {
						logErrorInDev('[setActiveTask] API call failed:', error);
						toast.error('Failed to update active task', {
							description: getErrorMessage(error)
						});
						// Rollback: restore previous state and clear expected ID
						expectedActiveTaskIdRef.current = previousTaskId || null;
						setActiveTaskIdCookie(previousTaskId || '');
						setActiveTeamTask(previousTask);
						setActiveUserTaskCookieCb(previousTask);
					}
				}
			} finally {
				// Always clear the flag, even if an error occurred
				setIsUpdatingActiveTask(false);
			}
		},
		[
			setActiveTeamTask,
			setActiveUserTaskCookieCb,
			updateOrganizationTeamEmployeeActiveTask,
			activeTeam,
			$memberActiveTaskId,
			$user,
			tasksRef,
			updateTask,
			setIsUpdatingActiveTask
		]
	);

	useConditionalUpdateEffect(
		() => {
			// Skip if we're currently updating the active task
			if (isUpdatingActiveTask) {
				return;
			}

			// If we have an expected task ID (user just selected a task locally):
			// - If server data matches → clear expectation, no need to update (already correct)
			// - If server data differs → skip update (server has stale data, wait for it to sync)
			if (expectedActiveTaskIdRef.current) {
				if (memberActiveTaskId === expectedActiveTaskIdRef.current) {
					// Server confirmed our selection
					expectedActiveTaskIdRef.current = null;
				}
				// Either way, skip - local state is already correct
				return;
			}

			// No local expectation - sync from server (multi-device sync or initial load)
			const memberActiveTask = tasks.find((item) => item.id === memberActiveTaskId);
			if (memberActiveTask) {
				setActiveTeamTask(memberActiveTask);
			}
		},
		[activeTeam, tasks, memberActiveTaskId, isUpdatingActiveTask],
		Boolean(activeTeamTask)
	);

	return { setActiveTask, isUpdatingActiveTask };
};
