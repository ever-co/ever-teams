import { registerRunningTimeWriter, runningTimeWriter } from './running-time-writer';
import type { RunningTimeWriter } from './running-time-writer';

function aWriter(): RunningTimeWriter {
	return { beforeStop: jest.fn(() => Promise.resolve()), afterChange: jest.fn() };
}

describe('the other writer of the running time', () => {
	it('is none in the app people install', () => {
		expect(runningTimeWriter()).toBeNull();
	});

	it('is the one registered, until it is withdrawn', () => {
		const heartbeat = aWriter();
		const withdraw = registerRunningTimeWriter(heartbeat);
		expect(runningTimeWriter()).toBe(heartbeat);

		withdraw();

		expect(runningTimeWriter()).toBeNull();
	});

	it('stays the one registered last when an earlier one is withdrawn', () => {
		const earlier = aWriter();
		const later = aWriter();
		const withdrawEarlier = registerRunningTimeWriter(earlier);
		const withdrawLater = registerRunningTimeWriter(later);

		withdrawEarlier();

		expect(runningTimeWriter()).toBe(later);
		withdrawLater();
	});
});
