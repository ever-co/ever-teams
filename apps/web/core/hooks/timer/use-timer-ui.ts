'use client';

import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useRef } from 'react';

import { convertMsToTime, secondsToTime } from '@/core/lib/helpers/date-and-time';
import {
	localTimerStatusState,
	timeCounterIntervalState,
	timeCounterState,
	timerSecondsState,
	timerStatusReceiptState,
	timerStatusState
} from '@/core/stores';
import { ITimerStatus, ITimerStatusReceipt } from '@/core/types/interfaces/timer/timer-status';
import { TTask } from '@/core/types/schemas/task/task.schema';

import { useSyncRef } from '../common/use-sync-ref';

// ==================== TYPES ====================

export interface UseTimerUiParams {
	/** Whether the initial data load has completed */
	firstLoad: boolean;
	/** The currently active team task (used to reset timerSeconds on task change) */
	activeTeamTask: TTask | null;
}

const TICK_INTERVAL_MS = 50;

// ==================== HOOK ====================

/**
 * Layer 3: UI & Animation — "The Face"
 *
 * Drives the ticking clock without rendering it: a 50ms interval writes `timeCounterState` (elapsed
 * milliseconds) and, once per second, `timerSecondsState` (for the progress bars). The hook subscribes
 * to neither atom, so its owner (InitState, the Timer's status layer) does not re-render on every tick;
 * the digits are read by `useTimerClock`, mounted only where they are displayed.
 *
 * This hook does NOT manage:
 * - localStorage persistence (→ useTimerStorage)
 * - API calls or business logic (→ useTimerApi)
 */
export function useTimerUi({ firstLoad, activeTeamTask }: UseTimerUiParams): void {
	const [timeCounterInterval, setTimeCounterInterval] = useAtom(timeCounterIntervalState);
	const setTimeCounter = useSetAtom(timeCounterState);
	const setTimerSeconds = useSetAtom(timerSecondsState);
	const setTimerStatusReceipt = useSetAtom(timerStatusReceiptState);

	// Read shared atoms (written by other layers)
	const localTimerStatus = useAtomValue(localTimerStatusState);
	const timerStatus = useAtomValue(timerStatusState);
	const timerRunning = Boolean(timerStatus?.running);
	const timerStatusKnown = Boolean(timerStatus);

	const timeCounterIntervalRef = useSyncRef(timeCounterInterval);
	// The seconds already published, so the per-second atom is written once per second and never goes back.
	const timerSecondsRef = useRef(0);

	// Reset timerSeconds when active task changes
	useEffect(() => {
		if (firstLoad) {
			timerSecondsRef.current = 0;
			setTimerSeconds(0);
		}
	}, [activeTeamTask?.id, setTimerSeconds, firstLoad]);

	// A stopped timer (as the API reports it) resets the progress seconds
	useEffect(() => {
		if (!firstLoad) return;
		const stopped = timerStatusKnown && !timerRunning;
		if (stopped) {
			timerSecondsRef.current = 0;
			setTimerSeconds(0);
		}
	}, [firstLoad, timerRunning, timerStatusKnown, setTimerSeconds]);

	// ==================== TICKING INTERVAL ====================

	/**
	 * High-frequency interval (50ms) that drives the visual clock.
	 * - Starts when localTimerStatus.running becomes true
	 * - Stops when localTimerStatus.running becomes false (resets counter to 0)
	 * - Calculates elapsed time from localTimerStatus.runnedDateTime
	 */
	useEffect(() => {
		if (!firstLoad || !localTimerStatus) return;

		window.clearInterval(timeCounterIntervalRef.current);

		if (localTimerStatus.running) {
			const tick = () => {
				const elapsed = Date.now() - localTimerStatus.runnedDateTime;
				setTimeCounter(elapsed);

				const elapsedSeconds = Math.floor(elapsed / 1000);
				const secondsAdvanced = elapsedSeconds > timerSecondsRef.current;
				if (secondsAdvanced) {
					timerSecondsRef.current = elapsedSeconds;
					setTimerSeconds(elapsedSeconds);
				}
			};
			setTimeCounterInterval(window.setInterval(tick, TICK_INTERVAL_MS));
		} else {
			setTimeCounter(0);
		}

		return () => {
			window.clearInterval(timeCounterIntervalRef.current);
		};
	}, [localTimerStatus, firstLoad, setTimeCounter, setTimerSeconds, setTimeCounterInterval, timeCounterIntervalRef]);

	// ==================== STATUS RECEIPT ====================

	// A running status duration already counts the running log up to the moment it was read, so
	// useLiveTimerStatus adds only the time elapsed since the status arrived
	useEffect(() => {
		if (firstLoad) {
			setTimerStatusReceipt((previousReceipt) => getNextStatusReceipt(previousReceipt, timerStatus));
		}
	}, [firstLoad, timerStatus, setTimerStatusReceipt]);
}

// ==================== STANDALONE HOOKS ====================

function getNextStatusReceipt(
	previousReceipt: ITimerStatusReceipt,
	timerStatus: ITimerStatus | null
): ITimerStatusReceipt {
	// A shell mounted again (the (main) layout after a page outside it) finds the status it recorded: its read time is
	// unchanged
	const isRecordedStatus = previousReceipt.status === timerStatus;
	if (isRecordedStatus) {
		return previousReceipt;
	}
	const receivedAt = Date.now();
	return { status: timerStatus, receivedAt };
}

function getSecondsSinceReceipt(timerStatus: ITimerStatus, receipt: ITimerStatusReceipt): number {
	// A status that arrived in this render is recorded right after it: it was read a moment ago
	const isReceiptForThisStatus = receipt.status === timerStatus;
	if (!isReceiptForThisStatus) {
		return 0;
	}
	const elapsedMs = Date.now() - receipt.receivedAt;
	const elapsedSeconds = Math.floor(elapsedMs / 1000);
	return Math.max(0, elapsedSeconds);
}

/**
 * Running seconds the status duration does not count yet. A running status counts its running log up to the
 * moment it was received; before the status reports the timer running (page load, start request in flight),
 * the local seconds are the only count of the session.
 */
function getUncountedRunningSeconds(
	timerStatus: ITimerStatus | null,
	receipt: ITimerStatusReceipt,
	isLocalTimerRunning: boolean,
	localSeconds: number
): number {
	if (timerStatus?.running) {
		return getSecondsSinceReceipt(timerStatus, receipt);
	}
	if (isLocalTimerRunning) {
		return localSeconds;
	}
	return 0;
}

/**
 * The ticking digits. Subscribes to the 50ms counter: mount it in the smallest component that shows the
 * clock, never in a layout or a card.
 */
export function useTimerClock() {
	const timeCounter = useAtomValue(timeCounterState);
	const { hours, minutes, seconds, ms_p } = convertMsToTime(timeCounter);

	return { timeCounter, hours, minutes, seconds, ms_p };
}

/**
 * Lightweight hook for components that only need the live timer display.
 * Does NOT trigger high-frequency re-renders from the ticking interval —
 * it reads the `timerSecondsState` atom which updates once per second.
 */
export function useLiveTimerStatus() {
	const seconds = useAtomValue(timerSecondsState);
	const timerStatus = useAtomValue(timerStatusState);
	const timerStatusReceipt = useAtomValue(timerStatusReceiptState);
	const localTimerStatus = useAtomValue(localTimerStatusState);
	const isLocalTimerRunning = localTimerStatus?.running === true;
	const statusDuration = timerStatus?.duration || 0;
	const uncountedSeconds = getUncountedRunningSeconds(timerStatus, timerStatusReceipt, isLocalTimerRunning, seconds);
	const totalSeconds = statusDuration + uncountedSeconds;
	const { hours: h, minutes: m } = secondsToTime(totalSeconds);

	return {
		time: { h, m },
		seconds,
		timerStatus
	};
}
