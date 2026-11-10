import { deliversPromptly, trackPromptDelivery } from './delivery';

/**
 * A tab stops polling chat and notifications only where the platform says an event reaches its socket as soon as it
 * is written. Where it does not (the platform dispatched once a minute, or only in another process), a tab that
 * stopped polling showed a colleague's message up to a minute late.
 */
describe('deliversPromptly', () => {
	it('trusts the push only when the platform says delivery is prompt', () => {
		expect(deliversPromptly({ delivery: { dispatch: 'inline', shared: false, prompt: true } })).toBe(true);
		expect(deliversPromptly({ delivery: { dispatch: 'queue', shared: true, prompt: true } })).toBe(true);
	});

	it('keeps polling for a platform that does not say so', () => {
		expect(deliversPromptly({ delivery: { dispatch: 'queue', shared: false, prompt: false } })).toBe(false);
		// A platform older than the field.
		expect(deliversPromptly({})).toBe(false);
		expect(deliversPromptly({ delivery: null })).toBe(false);
		expect(deliversPromptly(undefined)).toBe(false);
		// Only a boolean true counts.
		expect(deliversPromptly({ delivery: { prompt: 'true' as unknown as boolean } })).toBe(false);
	});
});

/** A question to the platform the case answers when it chooses. */
function pending() {
	let answer!: (value: { delivery?: { prompt?: boolean } } | null) => void;
	let refuse!: (error: Error) => void;
	const promise = new Promise<{ delivery?: { prompt?: boolean } } | null>((resolve, reject) => {
		answer = resolve;
		refuse = reject;
	});
	return { promise, answer, refuse };
}

describe('trackPromptDelivery', () => {
	it('applies the answer the platform gives when the connection comes up', async () => {
		const set = jest.fn();
		const tracker = trackPromptDelivery(async () => ({ delivery: { prompt: true } }), set);

		await tracker.onStatus('connected');

		expect(set).toHaveBeenLastCalledWith(true);
	});

	it('keeps the polls for a platform that does not deliver promptly, or cannot be asked', async () => {
		const set = jest.fn();
		await trackPromptDelivery(async () => ({ delivery: { prompt: false } }), set).onStatus('connected');
		expect(set).toHaveBeenLastCalledWith(false);

		await trackPromptDelivery(async () => {
			throw new Error('Network Error');
		}, set).onStatus('connected');
		expect(set).toHaveBeenLastCalledWith(false);
	});

	it('says no as soon as the connection is not up, without asking', async () => {
		const set = jest.fn();
		const read = jest.fn(async () => ({ delivery: { prompt: true } }));
		const tracker = trackPromptDelivery(read, set);

		await tracker.onStatus('reconnecting');

		expect(set).toHaveBeenLastCalledWith(false);
		expect(read).not.toHaveBeenCalled();
	});

	it('lets only the latest question count, so an older answer cannot pause the polls again', async () => {
		const set = jest.fn();
		const first = pending();
		const second = pending();
		const reads = [first, second];
		const tracker = trackPromptDelivery(() => (reads.shift() ?? second).promise, set);

		const before = tracker.onStatus('connected');
		const dropped = tracker.onStatus('reconnecting');
		const after = tracker.onStatus('connected');

		// The platform was redeployed in between: the newer answer comes first, the older one last.
		second.answer({ delivery: { prompt: false } });
		first.answer({ delivery: { prompt: true } });
		await Promise.all([before, dropped, after]);

		expect(set.mock.calls.map(([value]) => value)).toEqual([false, false]);
	});

	it('ignores answers still on their way once disposed', async () => {
		const set = jest.fn();
		const read = pending();
		const tracker = trackPromptDelivery(() => read.promise, set);

		const asked = tracker.onStatus('connected');
		tracker.dispose();
		read.answer({ delivery: { prompt: true } });
		await asked;

		expect(set).not.toHaveBeenCalled();
	});
});
