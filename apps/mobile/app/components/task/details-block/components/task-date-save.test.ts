import { saveTaskDate } from './task-date-save';
import type { ITeamTask } from '../../../../services/interfaces/ITask';

const hatch = {
	id: 'task-1',
	title: 'Repaint maintenance hatch',
	startDate: null,
	dueDate: null
} as unknown as ITeamTask;
const saturday = '2026-11-28T00:00:00.000Z';

describe("saving a task's date", () => {
	it('shows the new date at once, before the save answers, then keeps it once saved', async () => {
		const shown: ITeamTask[] = [];
		let answerSave: (saved: boolean) => void = () => undefined;
		const saving = saveTaskDate(
			hatch,
			{ dueDate: saturday },
			{
				show: (task) => shown.push(task),
				save: () => new Promise<boolean>((resolve) => (answerSave = resolve))
			}
		);

		expect(shown).toHaveLength(1);
		expect(shown[0].dueDate).toBe(saturday);

		answerSave(true);
		await expect(saving).resolves.toBe(true);
		expect(shown).toHaveLength(1);
	});

	it('puts the task back as it was when the save is refused or fails', async () => {
		const shown: ITeamTask[] = [];
		const refused = await saveTaskDate(
			hatch,
			{ startDate: saturday },
			{
				show: (task) => shown.push(task),
				save: async () => false
			}
		);
		const failed = await saveTaskDate(
			hatch,
			{ startDate: saturday },
			{
				show: (task) => shown.push(task),
				save: async () => {
					throw new Error('offline');
				}
			}
		);

		expect(refused).toBe(false);
		expect(failed).toBe(false);
		expect(shown.map((task) => task.startDate)).toEqual([saturday, null, saturday, null]);
	});
});
