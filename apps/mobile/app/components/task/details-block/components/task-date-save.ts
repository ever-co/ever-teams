import type { ITeamTask } from '../../../../services/interfaces/ITask';

type TaskDateChanges = Partial<Pick<ITeamTask, 'startDate' | 'dueDate'>>;
type DateKey = keyof TaskDateChanges;

const DATE_KEYS: DateKey[] = ['startDate', 'dueDate'];

interface ITaskDateSave {
	/** The task as the page's store holds it now. */
	current: () => ITeamTask;
	/** Puts the task on the page, through the task store. */
	show: (task: ITeamTask) => unknown;
	/** Sends the task; true once the API took it. */
	save: (task: ITeamTask) => Promise<boolean>;
}

function changedKeysOf(changes: TaskDateChanges): DateKey[] {
	return DATE_KEYS.filter((key) => key in changes);
}

/** The task with a failed save's dates taken back, each only while the page still shows the value that save set. */
function rolledBackOf(task: ITeamTask, changes: TaskDateChanges, previous: TaskDateChanges): ITeamTask {
	const rolledBack = { ...task };
	for (const key of changedKeysOf(changes)) {
		const isStillShown = task[key] === changes[key];
		if (isStillShown) {
			rolledBack[key] = previous[key] ?? null;
		}
	}
	return rolledBack;
}

async function sendSafely(save: ITaskDateSave['save'], task: ITeamTask): Promise<boolean> {
	try {
		return await save(task);
	} catch {
		return false;
	}
}

/**
 * A task's new date shows on the page at once, as the calendar dialog did, then goes to the API with the task as the
 * page showed it when the day was picked. A refused or failed save takes its date back, unless the page shows another
 * task by then or that date changed meanwhile. The page sends one date save at a time (useOneSaveAtATime), so a save
 * never carries another one's pending date. The page reads the task store, which a save only refreshes with the task
 * list.
 */
export async function saveTaskDate(changes: TaskDateChanges, { current, show, save }: ITaskDateSave) {
	const before = current();
	const previous: TaskDateChanges = {};
	for (const key of changedKeysOf(changes)) {
		previous[key] = before[key];
	}
	const changed = { ...before, ...changes };
	show(changed);
	const isSaved = await sendSafely(save, changed);
	const now = current();
	const showsSameTask = now?.id === changed.id;
	if (!isSaved && showsSameTask) {
		show(rolledBackOf(now, changes, previous));
	}
	return isSaved;
}
