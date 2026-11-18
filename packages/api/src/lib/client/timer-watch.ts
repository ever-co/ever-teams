import { ITimerStatus, TimerChange } from '@ever-teams/toolkit-types';
import { clientError } from './error-mapping';
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
		let status: ITimerStatus;
		try {
			status = await read();
		} catch (error) {
			if (!stopped) {
				reportReadError(error);
			}
			return;
		}
		if (stopped) {
			return;
		}
		const change = timerChangeOf(status, told);
		if (change === null) {
			return;
		}
		told = change;
		tellListener(change);
	}

	async function readIfVisible(): Promise<void> {
		const busy = stopped || reading;
		if (busy || !pageIsVisible()) {
			return;
		}
		reading = true;
		try {
			await readOnce();
		} finally {
			reading = false;
		}
	}

	const readNow = () => {
		void readIfVisible();
	};
	const events = networkEvents();
	const interval = setInterval(readNow, every);
	if (typeof document !== 'undefined') {
		document.addEventListener('visibilitychange', readNow);
	}
	events?.addEventListener('online', readNow);
	readNow();

	return () => {
		stopped = true;
		clearInterval(interval);
		if (typeof document !== 'undefined') {
			document.removeEventListener('visibilitychange', readNow);
		}
		events?.removeEventListener('online', readNow);
	};
}
