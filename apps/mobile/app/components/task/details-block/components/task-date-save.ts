import type { ITeamTask } from '../../../../services/interfaces/ITask';

type TaskDateChanges = Partial<Pick<ITeamTask, 'startDate' | 'dueDate'>>;

interface ITaskDateSave {
	/** The task as the page's store holds it now. */
	current: () => ITeamTask;
	/** Puts the task on the page, through the task store. */
	show: (task: ITeamTask) => unknown;
	/** Sends the task; true once the API took it. */
	save: (task: ITeamTask) => Promise<boolean>;
}

/** The dates a save changes, as the task held them before it. */
function previousDatesOf(task: ITeamTask, changes: TaskDateChanges): TaskDateChanges {
	const previous: TaskDateChanges = {};
	if ('startDate' in changes) {
		previous.startDate = task.startDate;
	}
	if ('dueDate' in changes) {
		previous.dueDate = task.dueDate;
	}
	return previous;
}

/**
 * A task's new date shows on the page at once, as the calendar dialog did, then goes to the API; a refused or failed
 * save takes back only its own date, on the task as it is by then, so a date saved meanwhile stays. The page reads
 * the task store, which a save only refreshes with the task list.
 */
export async function saveTaskDate(changes: TaskDateChanges, { current, show, save }: ITaskDateSave) {
	const before = current();
	const previous = previousDatesOf(before, changes);
	const changed = { ...before, ...changes };
	show(changed);
	let isSaved = false;
	try {
		isSaved = await save(changed);
	} catch {
		isSaved = false;
	}
	if (!isSaved) {
		show({ ...current(), ...previous });
	}
	return isSaved;
}
