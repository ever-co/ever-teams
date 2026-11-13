import type { TTask } from '@/core/types/schemas/task/task.schema';

const TASK_PAGE_PATH = '/task/';

function taskOfPage(pathname: string | null, detailedTask: TTask | null): TTask | null {
	if (!pathname?.startsWith(TASK_PAGE_PATH)) {
		return null;
	}
	return detailedTask;
}

/**
 * The task a start is for: the one asked for, else the task page's own, else the active task. `pageTask` is the task
 * of the page when the start is that page's own: it then becomes the active task. A start that names another task
 * (from a card, from the command palette) is not the page's, and the task it names stays the active one.
 */
export function startTaskOf(
	explicitTask: TTask | undefined,
	pathname: string | null,
	detailedTask: TTask | null,
	activeTask: TTask | null
): { pageTask: TTask | null; taskToUse: TTask | null } {
	const pageTask = taskOfPage(pathname, detailedTask);
	if (explicitTask && explicitTask.id !== pageTask?.id) {
		return { pageTask: null, taskToUse: explicitTask };
	}
	return { pageTask, taskToUse: explicitTask || pageTask || activeTask };
}
