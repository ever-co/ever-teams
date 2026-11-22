import { saveTaskDate } from './task-date-save';
import type { ITeamTask } from '../../../../services/interfaces/ITask';

const hatch = {
	id: 'task-1',
	title: 'Repaint maintenance hatch',
	startDate: null,
	dueDate: null
} as unknown as ITeamTask;
const monday = '2026-11-23T00:00:00.000Z';
const saturday = '2026-11-28T00:00:00.000Z';

/** The task store of the page: what shows, and every task shown in turn. */
function storeOf(task: ITeamTask) {
	const store = { task, shown: [] as ITeamTask[] };
	return {
		store,
		current: () => store.task,
		show: (shown: ITeamTask) => {
			store.task = shown;
			store.shown.push(shown);
		}
	};
}

describe("saving a task's date", () => {
	it('shows the new date at once, before the save answers, then keeps it once saved', async () => {
		const { store, current, show } = storeOf(hatch);
		let answerSave: (saved: boolean) => void = () => undefined;
		const saving = saveTaskDate(
			{ dueDate: saturday },
			{
				current,
				show,
				save: () => new Promise<boolean>((resolve) => (answerSave = resolve))
			}
		);

		expect(store.task.dueDate).toBe(saturday);

		answerSave(true);
		await expect(saving).resolves.toBe(true);
		expect(store.shown).toHaveLength(1);
	});

	it('takes back only its own date when the save is refused or fails', async () => {
		const { store, current, show } = storeOf(hatch);

		const refused = await saveTaskDate({ startDate: saturday }, { current, show, save: async () => false });
		const failed = await saveTaskDate(
			{ startDate: saturday },
			{
				current,
				show,
				save: async () => {
					throw new Error('offline');
				}
			}
		);

		expect(refused).toBe(false);
		expect(failed).toBe(false);
		expect(store.task.startDate).toBeNull();
	});

	it('keeps a date saved meanwhile when an earlier save of the other date fails', async () => {
		const { store, current, show } = storeOf(hatch);
		let failStart: () => void = () => undefined;
		const startSaving = saveTaskDate(
			{ startDate: monday },
			{
				current,
				show,
				save: () => new Promise<boolean>((resolve) => (failStart = () => resolve(false)))
			}
		);
		await saveTaskDate({ dueDate: saturday }, { current, show, save: async () => true });

		failStart();
		await startSaving;

		expect(store.task.startDate).toBeNull();
		expect(store.task.dueDate).toBe(saturday);
	});
});
