import type { ITrashedTask, ITrashedTaskPerson } from '@/core/types/interfaces/task/task-trash';

/** The HTTP status of a failed platform call, whatever shape the transport gave the error; `NaN` when it has none. */
export function trashHttpStatusOf(error: unknown): number {
	const failure = error as { statusCode?: unknown; status?: unknown; response?: { status?: unknown } } | null;
	return Number(failure?.statusCode ?? failure?.status ?? failure?.response?.status);
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
