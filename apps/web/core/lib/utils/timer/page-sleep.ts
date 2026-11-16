/**
 * Tells when the page's scripts stopped running for a while: the computer slept, or the browser paused the tab. A
 * page cannot see that happen. It sees, once its timers run again, that they are late.
 *
 * A tab in the background is not asleep: the browser runs its timers at least once a minute, well within what a
 * watcher asks about.
 */

/** How often the page looks at the clock. */
const LOOK_EVERY_MS = 15_000;

type SleepWatcher = (sleptForMs: number) => void;

/** Each watcher, with the time the page must have slept for it to be told. */
const watchers = new Map<SleepWatcher, number>();
let lastLookAt: number | null = null;
let ticker: ReturnType<typeof setInterval> | null = null;

/**
 * The page's scripts are running now. The watchers that asked about a time shorter than the one they had not run
 * for are told, before this returns: a caller about to act for the page (send a heartbeat) looks first, and so
 * learns of a sleep before it acts on it.
 */
export function lookAtPageClock(): void {
	if (lastLookAt === null) {
		return;
	}
	const now = Date.now();
	const sleptFor = now - lastLookAt;
	lastLookAt = now;
	for (const [watcher, longerThan] of [...watchers]) {
		if (sleptFor > longerThan) {
			watcher(sleptFor);
		}
	}
}

const WAKE_UP_EVENTS = ['pageshow', 'focus'] as const;
const DOCUMENT_WAKE_UP_EVENTS = ['visibilitychange', 'resume'] as const;

/**
 * Tells `onSlept` each time the page's scripts had not run for longer than `longerThanMs`.
 *
 * @returns The function that stops telling it.
 */
export function watchPageSleep(onSlept: SleepWatcher, longerThanMs: number): () => void {
	watchers.set(onSlept, longerThanMs);
	if (ticker === null && typeof window !== 'undefined') {
		lastLookAt = Date.now();
		ticker = setInterval(lookAtPageClock, LOOK_EVERY_MS);
		// The moments a person comes back to the page: the sleep is known before they can act in it
		for (const event of WAKE_UP_EVENTS) window.addEventListener(event, lookAtPageClock);
		for (const event of DOCUMENT_WAKE_UP_EVENTS) document.addEventListener(event, lookAtPageClock);
	}

	return () => {
		watchers.delete(onSlept);
		if (watchers.size > 0 || ticker === null) {
			return;
		}
		clearInterval(ticker);
		ticker = null;
		lastLookAt = null;
		for (const event of WAKE_UP_EVENTS) window.removeEventListener(event, lookAtPageClock);
		for (const event of DOCUMENT_WAKE_UP_EVENTS) document.removeEventListener(event, lookAtPageClock);
	};
}
