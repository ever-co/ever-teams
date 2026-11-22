import { saveTaskDate } from './task-date-save';
import type { ITeamTask } from '../../../../services/interfaces/ITask';

const hatch = {
	id: 'task-1',
	title: 'Repaint maintenance hatch',
	startDate: null,
	dueDate: null
} as unknown as ITeamTask;
const pier = {
	id: 'task-2',
	title: 'Inspect north pier bolts',
	startDate: null,
	dueDate: null
} as unknown as ITeamTask;
const monday = '2026-11-23T00:00:00.000Z';
const saturday = '2026-11-28T00:00:00.000Z';

/** The page's task store and an API that keeps what it takes; the save waits for the test to answer it. */
function benchOf(task: ITeamTask) {
	const bench = {
		shown: task,
		stored: { [task.id]: task } as Record<string, ITeamTask>,
		answer: (saved: boolean): unknown => saved
	};
	const options = {
		current: () => bench.shown,
		show: (shown: ITeamTask) => {
			bench.shown = shown;
		},
		save: (sent: ITeamTask) =>
			new Promise<boolean>((resolve) => {
				bench.answer = (saved: boolean) => {
					if (saved) {
						bench.stored[sent.id] = sent;
					}
					resolve(saved);
					return saved;
				};
			})
	};
	// lets the save reach the API before the test answers it
	const sent = async () => {
		for (let turn = 0; turn < 5; turn++) {
			await Promise.resolve();
		}
	};
	return { bench, options, sent };
}

describe("saving a task's date", () => {
	it('shows the new date at once, before the save answers, then keeps it once saved', async () => {
		const { bench, options, sent } = benchOf(hatch);
		const saving = saveTaskDate({ dueDate: saturday }, options);

		expect(bench.shown.dueDate).toBe(saturday);

		await sent();
		bench.answer(true);
		await expect(saving).resolves.toBe(true);
		expect(bench.shown.dueDate).toBe(saturday);
		expect(bench.stored['task-1'].dueDate).toBe(saturday);
	});

	it('takes its date back when the save is refused or fails, so the page shows what the API holds', async () => {
		const { bench, options, sent } = benchOf(hatch);
		const refused = saveTaskDate({ startDate: monday }, options);
		await sent();
		bench.answer(false);
		await expect(refused).resolves.toBe(false);
		const failed = saveTaskDate(
			{ startDate: monday },
			{
				...options,
				save: async () => {
					throw new Error('offline');
				}
			}
		);

		await expect(failed).resolves.toBe(false);
		expect(bench.shown.startDate).toBeNull();
		expect(bench.shown.startDate).toBe(bench.stored['task-1'].startDate);
	});

	it('saves the date on the task it was picked on, even when the page shows another task by then', async () => {
		const { bench, options, sent } = benchOf(hatch);
		const saving = saveTaskDate({ startDate: monday }, options);
		bench.shown = pier;

		await sent();
		bench.answer(true);
		await saving;

		expect(bench.stored['task-1'].startDate).toBe(monday);
		expect(bench.stored['task-2']).toBeUndefined();
		expect(bench.shown).toBe(pier);
	});

	it('leaves another task the page shows by then as it is when the save fails', async () => {
		const { bench, options, sent } = benchOf(hatch);
		const pierOnMonday = { ...pier, startDate: monday };
		const saving = saveTaskDate({ startDate: monday }, options);
		bench.shown = pierOnMonday;

		await sent();
		bench.answer(false);
		await saving;

		expect(bench.shown).toBe(pierOnMonday);
	});

	it('keeps a date that changed meanwhile, as when the task was reloaded, when the save fails', async () => {
		const { bench, options, sent } = benchOf(hatch);
		const saving = saveTaskDate({ startDate: monday }, options);
		bench.shown = { ...bench.shown, startDate: saturday };

		await sent();
		bench.answer(false);
		await saving;

		expect(bench.shown.startDate).toBe(saturday);
	});
});
