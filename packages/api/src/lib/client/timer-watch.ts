import { ITimerStatus, TimerChange } from '@ever-teams/toolkit-types';
import { clientError, isRecord } from './error-mapping';
import { timerChangeOf } from './timer-change';

export interface TimerWatchOptions {
	/** Milliseconds between two reads: 60 000 by default, the kit's rate, and 15 000 at least. */
	every?: number;
	/**
	 * Called with the error of a read that failed (an `EverTeamsError` with its `nextStep`, or what your getToken threw)
	 * and with what the listener threw. The watch goes on. Without it, a failed read is dropped and an error of the
	 * listener is thrown again on a fresh task.
	 */
	onError?: (error: unknown) => void;
}

export type TimerListener = (change: TimerChange) => void;

const DEFAULT_EVERY_MS = 60_000;
const MIN_EVERY_MS = 15_000;
// The longest delay a timer keeps: setInterval runs a longer one at once, over and over.
const MAX_EVERY_MS = 2_147_483_647;

const EVERY_STEP = 'Pass every as the milliseconds between two reads, 15000 or more, or leave it out (60000).';

function everyOf(every: number | undefined): number {
	if (every === undefined) {
		return DEFAULT_EVERY_MS;
	}
	const isNumber = typeof every === 'number' && !Number.isNaN(every);
	if (!isNumber) {
		throw clientError('CLIENT_OPTIONS', 'timer.watch takes every as a number of milliseconds.', EVERY_STEP);
	}
	const atLeastMinimum = Math.max(every, MIN_EVERY_MS);
	return Math.min(atLeastMinimum, MAX_EVERY_MS);
}

// A page reads only while it is visible; with no document (Node, a worker) every turn reads.
function pageIsVisible(): boolean {
	if (typeof document === 'undefined') {
		return true;
	}
	return document.visibilityState === 'visible';
}

// window in a page, self in a worker: where the browser tells that the network came back. Node has none.
function networkEvents(): EventTarget | null {
	const target = globalThis as Partial<EventTarget>;
	const listens = typeof target.addEventListener === 'function';
	const forgets = typeof target.removeEventListener === 'function';
	if (listens && forgets) {
		return globalThis as unknown as EventTarget;
	}
	return null;
}

// Thrown on a fresh task, as an uncaught error: never as the unhandled rejection of a read, and the watch goes on.
function throwLater(error: unknown): void {
	setTimeout(() => {
		throw error;
	}, 0);
}

// An answer with no status in it (null, an empty body, an object without a boolean running) is a failed read, as an
// answer of GET /user/me with no user is: it is not taken for a stopped timer, and the last change told stays the
// baseline.
function statusOf(answer: unknown): ITimerStatus {
	const hasStatus = isRecord(answer) && typeof answer['running'] === 'boolean';
	if (!hasStatus) {
		throw clientError(
			'UNEXPECTED_ANSWER',
			'GET /timesheet/timer/status answered no status.',
			"Check that apiUrl is the Ever Teams API's address (it ends with /api). The watch reads again at its next turn."
		);
	}
	return answer as unknown as ITimerStatus;
}

function callOnError(onError: (error: unknown) => void, error: unknown): void {
	try {
		onError(error);
	} catch (thrown) {
		throwLater(thrown);
	}
}

/**
 * Reads the status with `read` now, at every turn and when the page becomes visible or the network comes back, while
 * the page is visible, one read at a time; tells `listener` the first read and each change. Answers the stop.
 */
export function watchTimer(
	read: () => Promise<ITimerStatus>,
	listener: TimerListener,
	options: TimerWatchOptions = {}
): () => void {
	if (typeof listener !== 'function') {
		throw clientError(
			'CLIENT_OPTIONS',
			'timer.watch takes a listener function.',
			'Pass the function to call with each change: teams.timer.watch((change) => { ... }).'
		);
	}
	const every = everyOf(options.every);
	let told: TimerChange | null = null;
	let reading = false;
	// The page became visible or the network came back while a read was pending: one more read follows it.
	let readAgain = false;
	let stopped = false;

	function reportReadError(error: unknown): void {
		const onError = options.onError;
		if (onError) {
			callOnError(onError, error);
		}
	}

	// The host's listener runs apart from the read: what it throws goes to onError, or to a fresh task without one.
	function tellListener(change: TimerChange): void {
		try {
			listener(change);
		} catch (error) {
			const onError = options.onError;
			if (!onError) {
				throwLater(error);
				return;
			}
			callOnError(onError, error);
		}
	}

	async function readOnce(): Promise<void> {
		let change: TimerChange | null;
		try {
			const answer: unknown = await read();
			if (stopped) {
				return;
			}
			change = timerChangeOf(statusOf(answer), told);
		} catch (error) {
			if (!stopped) {
				reportReadError(error);
			}
			return;
		}
		if (change === null) {
			return;
		}
		// A copy: a listener that changes the object it receives does not change what the next read is compared to.
		told = { ...change };
		tellListener(change);
	}

	const readsAgain = () => readAgain && !stopped && pageIsVisible();

	async function readIfVisible(): Promise<void> {
		const busy = stopped || reading;
		if (busy || !pageIsVisible()) {
			return;
		}
		reading = true;
		try {
			do {
				readAgain = false;
				await readOnce();
			} while (readsAgain());
		} finally {
			reading = false;
		}
	}

	const readNow = () => {
		void readIfVisible();
	};
	// The read pending at such an event may have started before the change the event comes with: one more read follows
	// it. A turn of the interval during a read is dropped, as the next turn comes anyway.
	const readOnEvent = () => {
		if (reading) {
			readAgain = true;
			return;
		}
		readNow();
	};
	const events = networkEvents();
	const interval = setInterval(readNow, every);
	if (typeof document !== 'undefined') {
		document.addEventListener('visibilitychange', readOnEvent);
	}
	events?.addEventListener('online', readOnEvent);
	readNow();

	return () => {
		stopped = true;
		clearInterval(interval);
		if (typeof document !== 'undefined') {
			document.removeEventListener('visibilitychange', readOnEvent);
		}
		events?.removeEventListener('online', readOnEvent);
	};
}
