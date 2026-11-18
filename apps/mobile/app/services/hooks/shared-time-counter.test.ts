import { countTimeFrom, TIME_COUNTER_INTERVAL_MS } from './shared-time-counter';

describe('countTimeFrom', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		jest.setSystemTime(new Date('2026-11-18T09:00:00Z'));
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('counts once per tick, however many components ask for the time', () => {
		const write = jest.fn();
		const startedAt = Date.now();
		const stops = [1, 2, 3, 4, 5, 6].map(() => countTimeFrom(startedAt, write));

		jest.advanceTimersByTime(TIME_COUNTER_INTERVAL_MS * 4);

		expect(write).toHaveBeenCalledTimes(4);
		expect(write).toHaveBeenLastCalledWith(TIME_COUNTER_INTERVAL_MS * 4);
		stops.forEach((stop) => stop());
	});

	it('keeps counting while one component still shows the timer, and stops with the last one', () => {
		const write = jest.fn();
		const first = countTimeFrom(Date.now(), write);
		const second = countTimeFrom(Date.now(), write);

		first();
		jest.advanceTimersByTime(TIME_COUNTER_INTERVAL_MS);
		expect(write).toHaveBeenCalledTimes(1);

		second();
		jest.advanceTimersByTime(TIME_COUNTER_INTERVAL_MS * 3);
		expect(write).toHaveBeenCalledTimes(1);
	});

	it('ignores a component that stops asking twice', () => {
		const write = jest.fn();
		const first = countTimeFrom(Date.now(), write);
		const second = countTimeFrom(Date.now(), write);

		first();
		first();
		jest.advanceTimersByTime(TIME_COUNTER_INTERVAL_MS);

		expect(write).toHaveBeenCalledTimes(1);
		second();
	});
});
