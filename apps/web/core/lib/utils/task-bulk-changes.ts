import type { ITaskBulkChanges, ITaskBulkUpdateItem } from '@/core/types/interfaces/common/task-views';

/**
 * The status names the platform's bulk update takes (its `TaskStatusEnum`). The route refuses any other name for the
 * whole request, so a status the team made, renamed, or one of the names only this app knows (`todo`, `ready`,
 * `closed`) is named by its id alone (`taskStatusId`).
 */
export const PLATFORM_TASK_STATUSES: ReadonlySet<string> = new Set([
	'backlog',
	'open',
	'in-progress',
	'ready-for-review',
	'in-review',
	'blocked',
	'done',
	'completed',
	'cancelled',
	'custom'
]);

/** The name a bulk change gives a status: its value (or name) when the platform takes it, else none. */
export function bulkStatusNameOf(status: { name?: string | null; value?: string | null }): string | undefined {
	const name = status.value || status.name;
	return name && PLATFORM_TASK_STATUSES.has(name) ? name : undefined;
}

/**
 * The changes as the platform's bulk update takes them: a status name it does not know is left out (the status id
 * beside it says which status). `null` still clears.
 */
export function bulkChangesForPlatform(changes: ITaskBulkChanges): ITaskBulkChanges {
	if (changes.status === undefined || changes.status === null || PLATFORM_TASK_STATUSES.has(changes.status)) {
		return changes;
	}
	const next: ITaskBulkChanges = { ...changes };
	delete next.status;
	return next;
}

/** Whether an undo item's previous status cannot be put back: a name the platform does not take, with no id beside it. */
export function statusCannotBeRestored(item: ITaskBulkUpdateItem): boolean {
	const { status, taskStatusId } = item.changes;
	return typeof status === 'string' && !PLATFORM_TASK_STATUSES.has(status) && !taskStatusId;
}

/**
 * Undo items as the platform takes them: each one's changes as above, and an item left with nothing to change is
 * dropped (the route refuses a request with an empty item as a whole). A task's previous status name can be one the
 * platform does not take, a status written by the per-task update or by another client.
 */
export function bulkItemsForPlatform(items: readonly ITaskBulkUpdateItem[]): ITaskBulkUpdateItem[] {
	return items
		.map((item) => ({ ...item, changes: bulkChangesForPlatform(item.changes) }))
		.filter((item) => Object.keys(item.changes).length > 0);
}
