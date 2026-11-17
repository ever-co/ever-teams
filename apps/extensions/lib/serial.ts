/**
 * Runs each piece of work once the one before it has ended, whatever its outcome, in the order it was asked for. The
 * background sends its calls about the timer this way (background.ts): a heartbeat and a stop's last credit that run
 * at once both read the run's last heartbeat before either lands, and credit the same seconds twice.
 */
export function createSerialQueue(): <T>(work: () => Promise<T>) => Promise<T> {
	let tail: Promise<unknown> = Promise.resolve();
	return <T>(work: () => Promise<T>): Promise<T> => {
		const run = tail.then(() => work());
		// The next piece waits for this one to end, not to succeed
		tail = run.catch(() => undefined);
		return run;
	};
}
