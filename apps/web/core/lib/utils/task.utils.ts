import { Queue } from '.';
import { TTask } from '@/core/types/schemas/task/task.schema';

export const taskUpdateQueue = new Queue(1);

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
