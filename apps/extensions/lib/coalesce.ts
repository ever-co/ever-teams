/**
 * Runs `work` one call at a time. A call asked for while one runs waits for it to end, and all the calls asked for
 * meanwhile run as one, with their arguments merged: two alarms during one slow read make one more read, not two.
 * Answers a promise that settles when the run that covers the call has ended. `work` reports its own failures: a
 * failed run ends like any other, and the waiting one starts.
 */
export function createCoalescedRunner<T>(
	work: (argument: T) => Promise<void>,
	merge: (waiting: T, next: T) => T
): (argument: T) => Promise<void> {
	let running: Promise<void> | null = null;
	let waiting: { argument: T; ended: Promise<void> } | null = null;

	const run = (argument: T): Promise<void> => {
		const ended = work(argument).then(
			() => undefined,
			() => undefined
		);
		running = ended.then(() => {
			running = null;
		});
		return running;
	};

	return (argument: T) => {
		// Checked first: between the end of a run and the start of the waiting one, nothing else may start
		if (waiting) {
			waiting.argument = merge(waiting.argument, argument);
			return waiting.ended;
		}
		if (!running) {
			return run(argument);
		}
		const next: { argument: T; ended: Promise<void> } = { argument, ended: Promise.resolve() };
		next.ended = running.then(() => {
			waiting = null;
			// `next === waiting` (set below) on purpose: the calls asked for meanwhile merged their arguments into
			// `waiting.argument`, so `next.argument` is the merged one. A copy of it would lose those merges.
			return run(next.argument);
		});
		waiting = next;
		return next.ended;
	};
}
