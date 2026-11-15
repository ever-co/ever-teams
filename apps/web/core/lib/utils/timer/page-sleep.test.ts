/** @jest-environment jsdom */
/**
 * A page learns that its scripts stopped running for a while (the computer slept, the browser paused the tab) from
 * its own timers being late (#5123).
 */
import { lookAtPageClock, watchPageSleep } from './page-sleep';

const MINUTE = 60_000;
const FLOOR = 3 * MINUTE;

let stopWatching: (() => void) | undefined;
const onSlept = jest.fn();

/** Time passes with the page's timers running. */
const pass = (milliseconds: number) => jest.advanceTimersByTime(milliseconds);
/** Time passes at once, as for a computer that sleeps: the clock moves on and no timer of the page runs. */
const sleep = (milliseconds: number) => jest.setSystemTime(Date.now() + milliseconds);

beforeEach(() => {
	jest.useFakeTimers();
	jest.setSystemTime(Date.parse('2026-11-14T14:05:00.000Z'));
	onSlept.mockReset();
	stopWatching = watchPageSleep(onSlept, FLOOR);
});

afterEach(() => {
	stopWatching?.();
	jest.useRealTimers();
});

describe('a page whose scripts stopped running', () => {
	it('is told nothing while its timers run, however long', () => {
		pass(30 * MINUTE);

		expect(onSlept).not.toHaveBeenCalled();
	});

	it('is told nothing in the background, where the browser runs its timers once a minute', () => {
		for (let minute = 0; minute < 30; minute += 1) {
			// A minute goes by before the browser lets the page's timer run
			sleep(MINUTE);
			lookAtPageClock();
		}

		expect(onSlept).not.toHaveBeenCalled();
	});

	it('learns of a sleep at the first look after it, with how long it was', () => {
		sleep(7 * MINUTE);
		expect(onSlept).not.toHaveBeenCalled();

		pass(15_000);

		expect(onSlept).toHaveBeenCalledTimes(1);
		expect(onSlept.mock.calls[0][0]).toBeGreaterThanOrEqual(7 * MINUTE);
		expect(onSlept.mock.calls[0][0]).toBeLessThan(8 * MINUTE);
	});

	it('learns of it the moment the person comes back to the tab', () => {
		sleep(7 * MINUTE);

		document.dispatchEvent(new Event('visibilitychange'));

		expect(onSlept).toHaveBeenCalledTimes(1);
	});

	it('learns of it before a caller that looks first acts on it', () => {
		sleep(7 * MINUTE);
		const order: string[] = [];
		onSlept.mockImplementation(() => order.push('told'));

		lookAtPageClock();
		order.push('heartbeat');

		expect(order).toEqual(['told', 'heartbeat']);
	});

	it('is told once per sleep', () => {
		sleep(7 * MINUTE);
		lookAtPageClock();

		pass(5 * MINUTE);

		expect(onSlept).toHaveBeenCalledTimes(1);
	});

	it('is told nothing of a sleep shorter than the time it asked about', () => {
		sleep(2 * MINUTE);

		pass(15_000);

		expect(onSlept).not.toHaveBeenCalled();
	});

	it('is no longer told once it stopped watching', () => {
		stopWatching?.();
		stopWatching = undefined;
		sleep(7 * MINUTE);

		pass(15_000);
		lookAtPageClock();

		expect(onSlept).not.toHaveBeenCalled();
	});
});
