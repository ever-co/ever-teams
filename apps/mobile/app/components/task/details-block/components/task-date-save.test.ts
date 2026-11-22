import { act, renderHook } from '@testing-library/react-native';
import { saveTaskDate, shownDatesOf, type TaskDateChanges } from './task-date-save';
import { useOneSaveAtATime } from './use-one-save-at-a-time';
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
const tuesday = '2026-11-24T00:00:00.000Z';
const saturday = '2026-11-28T00:00:00.000Z';

/**
 * The task page: its task store, the dates its fields show, and an API that keeps what it takes. Each save waits for
 * the test to answer it.
 */
function pageOf(task: ITeamTask) {
	const page = {
		task,
		pending: null as TaskDateChanges | null,
		stored: { [task.id]: task } as Record<string, ITeamTask>,
		sent: [] as ITeamTask[],
		answer: (saved: boolean): unknown => saved
	};
	const options = {
		current: () => page.task,
		showPending: (pending: TaskDateChanges | null) => {
			page.pending = pending;
		},
		keep: (kept: ITeamTask) => {
			page.task = kept;
		},
		save: (sent: ITeamTask) =>
			new Promise<boolean>((resolve) => {
				page.sent.push(sent);
				page.answer = (saved: boolean) => {
					if (saved) {
						page.stored[sent.id] = sent;
					}
					resolve(saved);
					return saved;
				};
			})
	};
	const shown = () => shownDatesOf(page.task, page.pending);
	// lets the save reach the API before the test answers it
	const reached = async () => {
		for (let turn = 0; turn < 5; turn++) {
			await Promise.resolve();
		}
	};
	return { page, options, shown, reached };
}

describe("saving a task's date", () => {
	it('shows the picked date on its field at once, and keeps it once the API took it', async () => {
		const { page, options, shown, reached } = pageOf(hatch);
		const saving = saveTaskDate({ dueDate: saturday }, options);

		expect(shown().dueDate).toBe(saturday);

		await reached();
		page.answer(true);
		await expect(saving).resolves.toBe(true);
		expect(page.pending).toBeNull();
		expect(page.task.dueDate).toBe(saturday);
		expect(page.stored['task-1'].dueDate).toBe(saturday);
	});

	it('keeps the saved dates in the page task while a date save is pending, so another save of the page never sends it', async () => {
		const { page, options, reached } = pageOf(hatch);
		const saving = saveTaskDate({ startDate: monday }, options);
		await reached();

		expect(page.task.startDate).toBeNull();

		page.answer(false);
		await saving;
	});

	it('goes back to what the API holds when the save is refused or fails', async () => {
		const { page, options, shown, reached } = pageOf(hatch);
		const refused = saveTaskDate({ startDate: monday }, options);
		await reached();
		page.answer(false);
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
		expect(page.pending).toBeNull();
		expect(shown().startDate).toBeNull();
		expect(shown().startDate).toBe(page.stored['task-1'].startDate);
	});

	it('saves the date on the task it was picked on, and leaves another task the page shows by then as it is', async () => {
		const { page, options, reached } = pageOf(hatch);
		const saving = saveTaskDate({ startDate: monday }, options);
		page.task = pier;

		await reached();
		page.answer(true);
		await saving;

		expect(page.stored['task-1'].startDate).toBe(monday);
		expect(page.stored['task-2']).toBeUndefined();
		expect(page.task).toBe(pier);
	});
});

describe("a task's two dates saved one at a time, against an API that keeps what it takes", () => {
	async function pageWithGuard() {
		const bench = pageOf(hatch);
		const { result } = await renderHook(() => useOneSaveAtATime());
		let running: Promise<unknown> = Promise.resolve();
		const pick = async (changes: TaskDateChanges) => {
			await act(async () => {
				running = result.current.runAlone(() => saveTaskDate(changes, bench.options));
				await bench.reached();
			});
		};
		const answer = async (saved: boolean) => {
			await act(async () => {
				bench.page.answer(saved);
				await running;
			});
		};
		return { ...bench, pick, answer };
	}

	it('keeps the page on what the API holds when the start is saved and the due date then fails', async () => {
		const { page, shown, pick, answer } = await pageWithGuard();

		await pick({ startDate: monday });
		await answer(true);
		await pick({ dueDate: saturday });
		await answer(false);

		expect(page.stored['task-1'].startDate).toBe(monday);
		expect(page.stored['task-1'].dueDate).toBeNull();
		expect(shown()).toEqual({ startDate: monday, dueDate: null });
	});

	it('sends no other pick of either date while one is pending, and saves a retry after a failure', async () => {
		const { page, shown, pick, answer } = await pageWithGuard();

		await pick({ startDate: monday });
		await pick({ startDate: tuesday });
		await pick({ dueDate: saturday });
		expect(page.sent).toHaveLength(1);

		await answer(false);
		expect(shown()).toEqual({ startDate: null, dueDate: null });
		expect(page.stored['task-1'].startDate).toBeNull();

		await pick({ startDate: tuesday });
		await answer(true);
		await pick({ dueDate: saturday });
		await answer(true);

		expect(page.stored['task-1']).toMatchObject({ startDate: tuesday, dueDate: saturday });
		expect(shown()).toEqual({ startDate: tuesday, dueDate: saturday });
	});
});
