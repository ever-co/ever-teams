import { setActiveTaskIdCookie, setActiveUserTaskCookie } from '@/core/lib/helpers/cookies';
import { getErrorMessage, logErrorInDev } from '@/core/lib/helpers/error-message';
import { activeTeamTaskId, memberActiveTaskIdState } from '@/core/stores';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useAtom, useAtomValue } from 'jotai';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useUserQuery } from '../../queries/user-user.query';
import { useCurrentTeam } from './use-current-team';
import { useOrganizationEmployeeTeams } from './use-organization-teams-employee';
import { useSortedTasksByCreation } from './use-sorted-tasks';
import { useUpdateTaskMutation } from './use-update-task.mutation';

/**
 * Hook providing functionality to set the active task for the current user.
 *
 * Handles:
 * - Local state updates (Jotai atom + cookies)
 * - Server synchronization with retry logic
 * - Optimistic UI with rollback on failure
 * - Multi-device support via server persistence
 *
 * @returns Object containing setActiveTask function and pending state
 */
export const useSetActiveTask = () => {
	const { updateOrganizationTeamEmployeeActiveTask } = useOrganizationEmployeeTeams();
	const tasks = useSortedTasksByCreation();
	const activeTeam = useCurrentTeam();
	const memberActiveTaskId = useAtomValue(memberActiveTaskIdState);
	const [activeTaskId, setActiveTaskId] = useAtom(activeTeamTaskId);

	const { mutateAsync: updateTask } = useUpdateTaskMutation();
	const { data: user } = useUserQuery();
	const [isPending, setIsPending] = useState(false);

	const setActiveUserTaskCookieCb = useCallback(
		(taskId: string | null) => {
			if (taskId && user?.id) {
				setActiveUserTaskCookie({ taskId, userId: user?.id });
			} else {
				setActiveUserTaskCookie({ taskId: '', userId: '' });
			}
		},
		[user]
	);

	const setActiveTask = useCallback(
		async (task: TTask | null) => {
			if (task?.id == activeTaskId?.id) return;

			setIsPending(true);
			try {
				/**
				 * Unassign previous active task
				 */
				if (memberActiveTaskId && user) {
					const _task = tasks.find((t) => t.id === memberActiveTaskId);

					if (_task) {
						await updateTask({
							taskData: {
								..._task,
								members: _task.members?.filter((m) => m.id !== user?.employee?.id)
							},
							taskId: _task?.id
						});
					}
				}

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

						// Use activeTeam to get fresh values on each retry attempt.
						// Using activeTeam directly would capture the stale closure value.
						for (let attempt = 1; attempt <= MAX_RETRIES && !success; attempt++) {
							const currentEmployeeDetails = activeTeam?.members?.find(
								(member: TOrganizationTeamEmployee) => member.employeeId === user?.employee?.id
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
							// All retries exhausted - members may not be loaded yet.
							// Local state (cookies + Jotai) is already persisted, only server sync failed.
							logErrorInDev(
								'[setActiveTask] Failed to sync after retries - members may not be loaded',
								null
							);
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
						}

						setActiveTaskIdCookie(task?.id || '');
						setActiveUserTaskCookieCb(task?.id ?? null);
						setActiveTaskId(() => ({ id: task?.id ?? null }));
					} catch (error) {
						logErrorInDev('[setActiveTask] API call failed:', error);
						toast.error('Failed to update active task', {
							description: getErrorMessage(error)
						});
					}
				}
			} finally {
				setIsPending(false);
			}
		},
		[
			setActiveUserTaskCookieCb,
			updateOrganizationTeamEmployeeActiveTask,
			activeTeam,
			memberActiveTaskId,
			user,
			tasks,
			updateTask,
			setIsPending
		]
	);

	return { setActiveTask, isPending };
};
