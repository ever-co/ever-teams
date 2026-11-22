import type { ITeamTask } from '../../../../services/interfaces/ITask';

type TaskDateChanges = Partial<Pick<ITeamTask, 'startDate' | 'dueDate'>>;

interface ITaskDateSave {
	/** Puts the task on the page, as the task store holds it. */
	show: (task: ITeamTask) => unknown;
	/** Sends the task; true once the API took it. */
	save: (task: ITeamTask) => Promise<boolean>;
}

/**
 * A task's new date shows on the page at once, as the calendar dialog did, then goes to the API; a refused or failed
 * save puts the task back as it was. The page reads the task store, which a save only refreshes with the task list.
 */
export async function saveTaskDate(task: ITeamTask, changes: TaskDateChanges, { show, save }: ITaskDateSave) {
	const changed = { ...task, ...changes };
	show(changed);
	let isSaved = false;
	try {
		isSaved = await save(changed);
	} catch {
		isSaved = false;
	}
	if (!isSaved) {
		show(task);
	}
	return isSaved;
}
