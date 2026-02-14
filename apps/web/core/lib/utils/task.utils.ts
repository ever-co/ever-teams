import { Queue } from '.';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';

export const taskUpdateQueue = new Queue(1);

/**
 * Get the total worked duration for a specific task from team member statistics.
 *
 * ⚠️ BACKEND WORKAROUND (ever-gauzy):
 * `StatisticService.getTasks()` in `statistic.service.ts` returns the task's TOTAL duration
 * across all employees in each member's `totalWorkedTasks`, instead of the per-employee
 * individual contribution. This means every member holds the same aggregated value.
 *
 * To avoid inflating the progress (N members × same total = N× the real value),
 * we use the first match instead of summing across members.
 *
 * See: `packages/core/src/lib/time-tracking/statistic/statistic.service.ts` → `getTasks()`
 * Called from: `organization-team.service.ts` → `syncLastWorkedTask()`
 *
 * TODO: Remove this workaround once the backend returns per-employee durations.
 *
 * @param members - The team members array (from activeTeam.members)
 * @param taskId - The task ID to look up
 * @returns The total worked duration in seconds for the task (0 if not found)
 */
export function getTaskTotalWorkedDuration(
	members: TOrganizationTeamEmployee[] | null | undefined,
	taskId: string | null | undefined
): number {
	if (!members?.length || !taskId) {
		return 0;
	}

	for (const member of members) {
		const taskStat = member?.totalWorkedTasks?.find((item: TTask) => item.id === taskId);
		if (taskStat?.duration) {
			return taskStat.duration;
		}
	}

	return 0;
}

/**
 * Check if a task belongs to a specific team.
 *
 * @param task - The task to check
 * @param teamId - The team ID to check against
 * @returns true if the task belongs to the team, false otherwise
 */
export function isTaskInTeam(task: TTask | null | undefined, teamId: string | null | undefined): boolean {
	if (!task || !teamId) {
		return false;
	}

	// Check if the task's teams array includes the specified team
	return task.teams?.some((team) => team.id === teamId) ?? false;
}

/**
 * Find a valid active task from a list of tasks that belongs to a specific team.
 *
 * @param tasks - The list of tasks to search in
 * @param taskId - The ID of the task to find
 * @param teamId - The team ID to validate against
 * @returns The task if found and valid, null otherwise
 */
export function getValidActiveTask(
	tasks: TTask[],
	taskId: string | null | undefined,
	teamId: string | null | undefined
): TTask | null {
	if (!taskId || !teamId || !tasks.length) {
		return null;
	}

	const task = tasks.find((t) => t.id === taskId);

	// Validate: task must exist AND belong to the specified team
	if (task && isTaskInTeam(task, teamId)) {
		return task;
	}

	return null;
}
