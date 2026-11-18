import { followRun, forgetRun, slotSeconds, writeRunTime, writeRunTimeBeforeStop } from './heartbeat';

describe('a heartbeat', () => {
	const at = Date.UTC(2026, 10, 18, 9, 0, 0);

	it('credits the seconds since the previous one', () => {
		expect(slotSeconds(at, at + 61_400)).toBe(61);
	});

	it('credits one interval when it is the first of the run', () => {
		expect(slotSeconds(null, at)).toBe(60);
	});

	it('never credits more than a 10-minute slot holds, nor less than nothing', () => {
		expect(slotSeconds(at, at + 30 * 60_000)).toBe(600);
		expect(slotSeconds(at, at - 5_000)).toBe(0);
	});
});

describe("the running timer's time, as the heartbeats and a stop write it", () => {
	const start = Date.UTC(2026, 10, 18, 9, 0, 0);
	const minutes = (count: number) => start + count * 60_000;
	let write: jest.Mock;

	beforeEach(() => {
		jest.useFakeTimers();
		forgetRun();
		write = jest.fn(async () => undefined);
	});

	function written(): number[] {
		return write.mock.calls.map(([seconds]) => seconds);
	}

	it('is written from when the run was seen, then from the last write the API answered', async () => {
		followRun('log-1', start);

		await writeRunTime(write, minutes(1));
		await writeRunTime(write, minutes(2));

		expect(written()).toEqual([60, 60]);
	});

	it('covers a failed write with the next one', async () => {
		followRun('log-1', start);
		write.mockRejectedValueOnce(new Error('offline'));

		await expect(writeRunTime(write, minutes(1))).rejects.toThrow('offline');
		await writeRunTime(write, minutes(2));

		expect(written()).toEqual([60, 120]);
	});

	it('keeps where it was when the same run is seen again, and starts over for another run', async () => {
		followRun('log-1', start);
		await writeRunTime(write, minutes(1));

		followRun('log-1', minutes(2));
		await writeRunTime(write, minutes(3));
		followRun('log-2', minutes(4));
		await writeRunTime(write, minutes(5));

		expect(written()).toEqual([60, 120, 60]);
	});

	it('before a stop of another run than the one followed, writes nothing', async () => {
		followRun('log-2', start);
		jest.setSystemTime(minutes(1));

		await writeRunTimeBeforeStop(write, 'log-1');

		expect(write).not.toHaveBeenCalled();
	});

	it('lets go of the run a stop names only, not of one followed since', async () => {
		followRun('log-2', start);

		forgetRun('log-1');
		await writeRunTime(write, minutes(1));

		expect(written()).toEqual([60]);
	});

	it('writes nothing once the run is let go of', async () => {
		followRun('log-1', start);
		forgetRun();

		await writeRunTime(write, minutes(1));

		expect(write).not.toHaveBeenCalled();
	});

	it('before a stop, waits for the write on its way, then writes the rest', async () => {
		followRun('log-1', start);
		let answer: () => void = () => undefined;
		write.mockImplementationOnce(
			() =>
				new Promise<void>((resolve) => {
					answer = resolve;
				})
		);
		const heartbeat = writeRunTime(write, minutes(1));
		jest.setSystemTime(minutes(1) + 25_000);

		const beforeStop = writeRunTimeBeforeStop(write, 'log-1');
		answer();
		await heartbeat;
		await beforeStop;

		expect(written()).toEqual([60, 25]);
	});
});
