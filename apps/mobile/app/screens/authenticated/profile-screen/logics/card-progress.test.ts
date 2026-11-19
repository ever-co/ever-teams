import { cardProgressOf } from './card-progress';

const TWO_HOURS = 7200;

describe("the ring of a task card on a person's Tasks tab", () => {
	it("shows a task's own time on one's own tab, never the time of the task the timer runs on", () => {
		const progress = cardProgressOf({
			isAuthUser: true,
			isActiveTask: false,
			taskSeconds: 0,
			activeTaskSeconds: 50_700,
			estimate: TWO_HOURS
		});

		expect(progress).toBe(0);
	});

	it('follows the live total on the card of the task the timer runs on', () => {
		const progress = cardProgressOf({
			isAuthUser: true,
			isActiveTask: true,
			taskSeconds: 3600,
			activeTaskSeconds: 5400,
			estimate: TWO_HOURS
		});

		expect(progress).toBe(75);
	});

	it("shows the task's own time on someone else's tab", () => {
		const progress = cardProgressOf({
			isAuthUser: false,
			isActiveTask: true,
			taskSeconds: 3600,
			activeTaskSeconds: 5400,
			estimate: TWO_HOURS
		});

		expect(progress).toBe(50);
	});

	it('stays empty while the time is not known yet', () => {
		expect(
			cardProgressOf({
				isAuthUser: true,
				isActiveTask: true,
				taskSeconds: undefined,
				activeTaskSeconds: undefined,
				estimate: TWO_HOURS
			})
		).toBe(0);
	});
});
