import type { ITeamTask } from '../../../../services/interfaces/ITask';

export type TaskDateChanges = Partial<Pick<ITeamTask, 'startDate' | 'dueDate'>>;
type TaskDates = Pick<ITeamTask, 'startDate' | 'dueDate'>;

interface ITaskDateSave {
	/** The task as the page's store holds it now. */
	current: () => ITeamTask;
	/** The picked dates shown on their fields while their save is pending, or null once it answered. */
	showPending: (pending: TaskDateChanges | null) => unknown;
	/** Puts the task the API took on the page, through the task store. */
	keep: (task: ITeamTask) => unknown;
	/** Sends the task; true once the API took it. */
	save: (task: ITeamTask) => Promise<boolean>;
}

async function sendSafely(save: ITaskDateSave['save'], task: ITeamTask): Promise<boolean> {
	try {
		return await save(task);
	} catch {
		return false;
	}
}

function pendingOrSaved(pending: TaskDateChanges | null, task: ITeamTask | null, key: keyof TaskDates) {
	const isPending = pending !== null && key in pending;
	if (isPending) {
		return pending[key] ?? null;
	}
	return task?.[key] ?? null;
}

/** The dates the page's fields show: a pending pick over the date the task holds. */
export function shownDatesOf(task: ITeamTask | null, pending: TaskDateChanges | null): TaskDates {
	return {
		startDate: pendingOrSaved(pending, task, 'startDate'),
		dueDate: pendingOrSaved(pending, task, 'dueDate')
	};
}

/**
 * A task's picked date shows on its field at once, as the calendar dialog did, and goes to the API with the task as
 * the page held it when the day was picked. The page's task keeps the saved dates until the API took the new one, so
 * another save of the page (status, size...) never sends a date still pending; the page sends one date save at a time
 * (useOneSaveAtATime). A refused or failed save leaves the task as the API holds it. The page reads the task store,
 * which a save only refreshes with the task list.
 */
export async function saveTaskDate(changes: TaskDateChanges, { current, showPending, keep, save }: ITaskDateSave) {
	const picked = { ...current(), ...changes };
	showPending(changes);
	const isSaved = await sendSafely(save, picked);
	const now = current();
	const showsSameTask = now?.id === picked.id;
	if (isSaved && showsSameTask) {
		keep({ ...now, ...changes });
	}
	showPending(null);
	return isSaved;
}
