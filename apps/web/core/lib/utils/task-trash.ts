import type { ITrashedTask, ITrashedTaskPerson } from '@/core/types/interfaces/task/task-trash';

/** The HTTP status of a failed platform call, whatever shape the transport gave the error; `NaN` when it has none. */
export function trashHttpStatusOf(error: unknown): number {
	const failure = error as { statusCode?: unknown; status?: unknown; response?: { status?: unknown } } | null;
	return Number(failure?.statusCode ?? failure?.status ?? failure?.response?.status);
}

/**
 * What a Delete forever came to. `not-in-trash`: someone restored the task, or deleted it, since the trash was read,
 * so nothing was deleted (the platform deletes a task only while it is in the trash); `still-linked`: other records
 * (a linked issue, a key result) still point at the task, so the platform keeps it in the trash; `failed`: the
 * platform refused it otherwise or could not be reached.
 */
export type TaskTrashDeleteOutcome = 'deleted' | 'not-in-trash' | 'still-linked' | 'failed';

/** Why a Delete forever failed: 404 says the task is no longer in the trash, 409 that other records point at it. */
export function trashDeleteFailureOf(error: unknown): Exclude<TaskTrashDeleteOutcome, 'deleted'> {
	const status = trashHttpStatusOf(error);
	if (status === 404) return 'not-in-trash';
	if (status === 409) return 'still-linked';
	return 'failed';
}

/** The name the trash shows for a person: their full name, else their user name, else nothing. */
export function trashedTaskPersonName(person: ITrashedTaskPerson | null | undefined): string {
	const fullName = [person?.firstName, person?.lastName]
		.map((part) => (typeof part === 'string' ? part.trim() : ''))
		.filter((part) => part.length > 0)
		.join(' ');
	if (fullName) return fullName;
	return typeof person?.name === 'string' ? person.name.trim() : '';
}

/** The task's key as the lists show it (`API-42`), else `#42`, else nothing. */
export function trashedTaskNumberOf(task: Pick<ITrashedTask, 'taskNumber' | 'prefix' | 'number'>): string {
	if (task.taskNumber) return task.taskNumber;
	if (typeof task.number !== 'number') return '';
	return task.prefix ? `${task.prefix}-${task.number}` : `#${task.number}`;
}
