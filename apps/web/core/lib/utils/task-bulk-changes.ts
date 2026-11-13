import type { ITaskBulkChanges, ITaskBulkUpdateItem } from '@/core/types/interfaces/common/task-views';
import type { TTask } from '@/core/types/schemas/task/task.schema';

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

/** The priority names the platform's bulk update takes (its `TaskPriorityEnum`); a team's own goes by its id alone. */
export const PLATFORM_TASK_PRIORITIES: ReadonlySet<string> = new Set(['urgent', 'high', 'medium', 'low']);

/** The size names the platform's bulk update takes (its `TaskSizeEnum`); a team's own goes by its id alone. */
export const PLATFORM_TASK_SIZES: ReadonlySet<string> = new Set(['x-large', 'large', 'medium', 'small', 'tiny']);

/** The fields a bulk change names by a name the platform must know, each with the record id that can stand for it. */
const NAMED_FIELDS = [
	{ name: 'status', id: 'taskStatusId', values: PLATFORM_TASK_STATUSES },
	{ name: 'priority', id: 'taskPriorityId', values: PLATFORM_TASK_PRIORITIES },
	{ name: 'size', id: 'taskSizeId', values: PLATFORM_TASK_SIZES }
] as const;

/** A status, priority or size as the pickers list it: its record's id, and its value or name. */
export interface TaskRecordChoice {
	id?: string | null;
	name?: string | null;
	value?: string | null;
}

/** The name a bulk change gives a status: its value (or name) when the platform takes it, else none. */
export function bulkStatusNameOf(status: TaskRecordChoice): string | undefined {
	const name = status.value || status.name;
	return name && PLATFORM_TASK_STATUSES.has(name) ? name : undefined;
}

/**
 * The changes that give tasks a priority or a size: its id, and its value when the platform takes it. The platform
 * gives a priority or size named by its id alone the record's own name. Null when neither can be sent (no id, and a
 * name the platform would refuse): the caller then updates each task on its own.
 */
export function bulkRecordChangesOf(field: 'priority' | 'size', choice: TaskRecordChoice): ITaskBulkChanges | null {
	const named = NAMED_FIELDS.find((item) => item.name === field);
	const name = choice.value || choice.name || undefined;
	const sendsName = !!name && !!named?.values.has(name);
	if (!named || (!choice.id && !sendsName)) {
		return null;
	}
	const changes: ITaskBulkChanges = {};
	if (choice.id) {
		changes[named.id] = choice.id;
	}
	if (sendsName) {
		changes[field] = name;
	}
	return changes;
}

/**
 * The record a priority or a size picked from a task's menu is saved with: the id of the item the menu lists it by
 * (its items are keyed by their record's value, else its name), or null when no record lists it. Undefined for any
 * other field, which is saved as before.
 */
export function listedRecordIdOf(
	field: string,
	items: Readonly<Record<string, { id?: string | null } | undefined>>,
	picked: unknown
): string | null | undefined {
	if (field !== 'priority' && field !== 'size') {
		return undefined;
	}
	return typeof picked === 'string' ? (items[picked]?.id ?? null) : null;
}

/** The record id a priority or a size is saved with. */
export const RECORD_ID_FIELDS = { priority: 'taskPriorityId', size: 'taskSizeId' } as const;

/**
 * The change that gives one task a priority or a size: its name (the value the picker lists) and its record's id
 * together, as the task page and the list write them, so the task holds the record it shows (a team's own included)
 * and every reader finds the same one. A choice without an id (no record lists that name) clears the record the task
 * held, so the two never name different priorities. Null when the task already has both.
 */
export function recordChangeOf(
	field: 'priority' | 'size',
	task: Partial<Record<'priority' | 'size' | 'taskPriorityId' | 'taskSizeId', string | null>>,
	choice: TaskRecordChoice & { value: string }
): Partial<TTask> | null {
	const idField = RECORD_ID_FIELDS[field];
	const recordId = choice.id ?? null;
	if (task[field] === choice.value && (task[idField] ?? null) === recordId) {
		return null;
	}
	return { [field]: choice.value, [idField]: recordId } as Partial<TTask>;
}

/**
 * The changes as the platform's bulk update takes them: a status, priority or size name it does not know is left
 * out (the id beside it says which one). `null` still clears.
 */
export function bulkChangesForPlatform(changes: ITaskBulkChanges): ITaskBulkChanges {
	const refused = NAMED_FIELDS.filter(({ name, values }) => {
		const value = changes[name];
		return value !== undefined && value !== null && !values.has(value);
	});
	if (!refused.length) {
		return changes;
	}
	const next: ITaskBulkChanges = { ...changes };
	for (const { name } of refused) {
		delete next[name];
	}
	return next;
}

/**
 * Whether an undo item's previous values cannot all be put back: a name the platform does not take, which the undo
 * leaves out. A status with its id beside it still goes back (the app reads a status by its id). A priority or size
 * does not: the platform leaves out of the previous values a name the record beside it gives back, so a name it
 * answers is one that record would not put back (none, or renamed since).
 */
export function previousCannotBeRestored(item: ITaskBulkUpdateItem): boolean {
	return NAMED_FIELDS.some(({ name, id, values }) => {
		const value = item.changes[name];
		const isLeftOut = typeof value === 'string' && !values.has(value);
		return isLeftOut && (name !== 'status' || !item.changes[id]);
	});
}

/**
 * Undo items as the platform takes them: each one's changes as above, and an item left with nothing to change is
 * dropped (the route refuses a request with an empty item as a whole). A task's previous status, priority or size
 * name can be one the platform does not take: a team's own, or one written by the per-task update or another client.
 */
export function bulkItemsForPlatform(items: readonly ITaskBulkUpdateItem[]): ITaskBulkUpdateItem[] {
	return items
		.map((item) => ({ ...item, changes: bulkChangesForPlatform(item.changes) }))
		.filter((item) => Object.keys(item.changes).length > 0);
}
