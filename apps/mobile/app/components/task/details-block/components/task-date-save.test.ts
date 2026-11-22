import { createSaveQueue, saveTaskDate } from './task-date-save';
import type { ITeamTask } from '../../../../services/interfaces/ITask';

const hatch = {
	id: 'task-1',
	title: 'Repaint maintenance hatch',
	startDate: null,
	dueDate: null
} as unknown as ITeamTask;
const monday = '2026-11-23T00:00:00.000Z';
const tuesday = '2026-11-24T00:00:00.000Z';
const saturday = '2026-11-28T00:00:00.000Z';

/**
 * The page's task store and an API that keeps what it takes. Each save waits for the test to answer it, in the order
 * the saves reach the API.
 */
function benchOf(task: ITeamTask) {
	const bench = { shown: task, stored: task, answers: [] as Array<(saved: boolean) => void> };
	const enqueue = createSaveQueue();
	const options = {
		current: () => bench.shown,
		show: (shown: ITeamTask) => {
			bench.shown = shown;
		},
		save: (sent: ITeamTask) =>
			new Promise<boolean>((resolve) => {
				bench.answers.push((saved) => {
					if (saved) {
						bench.stored = sent;
					}
					resolve(saved);
				});
			}),
		enqueue
	};
	// the queue hands each save on after a few microtasks: let them run, with no timer (the tests' timers are fake)
	const settle = async () => {
		for (let turn = 0; turn < 10; turn++) {
			await Promise.resolve();
		}
	};
	const answerNext = async (saved: boolean) => {
		await settle();
		const answer = bench.answers.shift();
		answer?.(saved);
		await settle();
	};
	return { bench, options, answerNext };
}

describe("saving a task's date", () => {
	it('shows the new date at once, before the save answers, then keeps it once saved', async () => {
		const { bench, options, answerNext } = benchOf(hatch);
		const saving = saveTaskDate({ dueDate: saturday }, options);

		expect(bench.shown.dueDate).toBe(saturday);

		await answerNext(true);
		await expect(saving).resolves.toBe(true);
		expect(bench.shown.dueDate).toBe(saturday);
		expect(bench.stored.dueDate).toBe(saturday);
	});

	it('takes its date back when the save is refused or fails', async () => {
		const { bench, options, answerNext } = benchOf(hatch);
		const refused = saveTaskDate({ startDate: saturday }, options);
		await answerNext(false);
		const failed = saveTaskDate(
			{ startDate: saturday },
			{
				...options,
				save: async () => {
					throw new Error('offline');
				}
			}
		);

		await expect(refused).resolves.toBe(false);
		await expect(failed).resolves.toBe(false);
		expect(bench.shown.startDate).toBeNull();
	});

	it('keeps a newer pick of the same date when an earlier save of it fails', async () => {
		const { bench, options, answerNext } = benchOf(hatch);
		const first = saveTaskDate({ startDate: monday }, options);
		const second = saveTaskDate({ startDate: tuesday }, options);

		await answerNext(false);
		await answerNext(true);
		await Promise.all([first, second]);

		expect(bench.shown.startDate).toBe(tuesday);
		expect(bench.stored.startDate).toBe(tuesday);
	});

	it('never lets the other date carry a date whose save failed, so the page and the API agree', async () => {
		const { bench, options, answerNext } = benchOf(hatch);
		const start = saveTaskDate({ startDate: monday }, options);
		const due = saveTaskDate({ dueDate: saturday }, options);

		await answerNext(false);
		await answerNext(true);
		await Promise.all([start, due]);

		expect(bench.stored.startDate).toBeNull();
		expect(bench.stored.dueDate).toBe(saturday);
		expect(bench.shown.startDate).toBe(bench.stored.startDate);
		expect(bench.shown.dueDate).toBe(bench.stored.dueDate);
	});
});
