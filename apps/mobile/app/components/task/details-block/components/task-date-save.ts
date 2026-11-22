import type { ITeamTask } from '../../../../services/interfaces/ITask';

type TaskDateChanges = Partial<Pick<ITeamTask, 'startDate' | 'dueDate'>>;
type DateKey = keyof TaskDateChanges;
type SaveRun = () => Promise<boolean>;

const DATE_KEYS: DateKey[] = ['startDate', 'dueDate'];

/** Runs saves one after another, in the order they were asked for, whatever each one answers. */
export function createSaveQueue() {
	let last: Promise<unknown> = Promise.resolve();
	return (run: SaveRun): Promise<boolean> => {
		const next = last.then(run, run);
		last = next.catch(() => undefined);
		return next;
	};
}

interface ITaskDateSave {
	/** The task as the page's store holds it now. */
	current: () => ITeamTask;
	/** Puts the task on the page, through the task store. */
	show: (task: ITeamTask) => unknown;
	/** Sends the task; true once the API took it. */
	save: (task: ITeamTask) => Promise<boolean>;
	/** The queue the page's date saves share. */
	enqueue: (run: SaveRun) => Promise<boolean>;
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
 * A task's new date shows on the page at once, as the calendar dialog did, then goes to the API after the page's
 * earlier date saves, built from the task as the page shows it when it leaves: a save never carries a date whose own
 * save failed. A refused or failed save takes its date back unless a newer pick replaced it. The page reads the task
 * store, which a save only refreshes with the task list.
 */
export async function saveTaskDate(changes: TaskDateChanges, { current, show, save, enqueue }: ITaskDateSave) {
	const before = current();
	const previous: TaskDateChanges = {};
	for (const key of changedKeysOf(changes)) {
		previous[key] = before[key];
	}
	show({ ...before, ...changes });
	const isSaved = await enqueue(() => sendSafely(save, current()));
	if (!isSaved) {
		show(rolledBackOf(current(), changes, previous));
	}
	return isSaved;
}
