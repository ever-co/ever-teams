/** How often the running time is counted: the timer shows hundredths of a second. */
export const TIME_COUNTER_INTERVAL_MS = 50;

type Write = (elapsedMs: number) => void;

/**
 * One counter for the whole app. Each component that shows the timer used to start its own, and each of them wrote
 * the same elapsed time into the store, which every one of those components observes.
 */
const counter = {
	users: 0,
	startedAt: 0,
	write: (() => undefined) as Write,
	interval: undefined as ReturnType<typeof setInterval> | undefined
};

function tick() {
	counter.write(Date.now() - counter.startedAt);
}

/**
 * Counts the time gone by since `startedAt` while at least one component asks for it.
 *
 * @returns the function that stops asking; the counter stops with the last one
 */
export function countTimeFrom(startedAt: number, write: Write): () => void {
	counter.startedAt = startedAt;
	counter.write = write;
	counter.users += 1;
	const firstUser = counter.users === 1;
	if (firstUser) {
		counter.interval = setInterval(tick, TIME_COUNTER_INTERVAL_MS);
	}
	let stopped = false;
	return () => {
		if (stopped) {
			return;
		}
		stopped = true;
		counter.users -= 1;
		const lastUser = counter.users === 0;
		if (lastUser) {
			clearInterval(counter.interval);
			counter.interval = undefined;
		}
	};
}
