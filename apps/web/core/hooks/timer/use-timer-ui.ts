'use client';

import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useMemo, useRef } from 'react';

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

export interface UseTimerUiReturn {
	/** Time elapsed in milliseconds (updates every 50ms when running) */
	timeCounter: number;
	/** Time elapsed in seconds (updates every second, for progress bar) */
	timerSeconds: number;
	/** Formatted time counter: { hours, minutes, seconds, ms_p } */
	fomatedTimeCounter: ReturnType<typeof convertMsToTime>;
}

// ==================== HOOK ====================

/**
 * Layer 3: UI & Animation — "The Face"
 *
 * Manages the high-frequency timer display state that powers
 * the visual ticking clock and progress bar.
 *
 * Responsibilities:
 * - Run a 50ms interval to update `timeCounter` (milliseconds elapsed)
 * - Derive `timerSeconds` for the progress bar (updates per second)
 * - Format the time counter for display (HH:MM:SS)
 * - Reset seconds counter when active task changes
 *
 * Performance note:
 * Only components subscribing to `timeCounter` or `timerSeconds` atoms
 * will re-render at high frequency. Components that only need `timerStatus`
 * (running/stopped) are NOT affected by this ticking.
 *
 * This hook does NOT manage:
 * - localStorage persistence (→ useTimerStorage)
 * - API calls or business logic (→ useTimerApi)
 */
export function useTimerUi({ firstLoad, activeTeamTask }: UseTimerUiParams): UseTimerUiReturn {
	const [timeCounterInterval, setTimeCounterInterval] = useAtom(timeCounterIntervalState);
	const [timeCounter, setTimeCounter] = useAtom(timeCounterState);
	const [timerSeconds, setTimerSeconds] = useAtom(timerSecondsState);
	const setTimerStatusReceipt = useSetAtom(timerStatusReceiptState);

	// Read shared atoms (written by other layers)
	const localTimerStatus = useAtomValue(localTimerStatusState);
	const timerStatus = useAtomValue(timerStatusState);

	// Refs for stable access in effects
	const timerStatusRef = useSyncRef(timerStatus);
	const timeCounterIntervalRef = useSyncRef(timeCounterInterval);
	const timerSecondsRef = useRef(0);

	const seconds = Math.floor(timeCounter / 1000);

	// ==================== PROGRESS BAR LOGIC ====================

	/**
	 * Compute the running seconds for the progress bar.
	 * Only increases (never decreases) while the timer is running.
	 * Resets to 0 when the timer stops.
	 */
	timerSecondsRef.current = useMemo(() => {
		if (!firstLoad) return 0;
		if (seconds > timerSecondsRef.current) {
			return seconds;
		}
		if (timerStatusRef.current && !timerStatusRef.current.running) {
			return 0;
		}
		return timerSecondsRef.current;
	}, [seconds, firstLoad, timerStatusRef]);
	// Reset timerSeconds when active task changes
	useEffect(() => {
		if (firstLoad) {
			timerSecondsRef.current = 0;
			setTimerSeconds(0);
		}
	}, [activeTeamTask?.id, setTimerSeconds, firstLoad]);

	// Initial sync of timerSeconds from ref
	useEffect(() => {
		if (firstLoad) {
			setTimerSeconds(timerSecondsRef.current);
		}
	}, [setTimerSeconds, firstLoad]);

	// Keep timerSeconds atom in sync with timerSecondsRef as timer ticks
	useEffect(() => {
		if (firstLoad && timerSecondsRef.current !== timerSeconds) {
			setTimerSeconds(timerSecondsRef.current);
		}
	}, [seconds, firstLoad, setTimerSeconds, timerSeconds]);

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
			setTimeCounterInterval(
				window.setInterval(() => {
					const now = Date.now();
					setTimeCounter(now - localTimerStatus.runnedDateTime);
				}, 50)
			);
		} else {
			setTimeCounter(0);
		}

		return () => {
			window.clearInterval(timeCounterIntervalRef.current);
		};
	}, [localTimerStatus, firstLoad, setTimeCounter, setTimeCounterInterval, timeCounterIntervalRef]);

	// ==================== STATUS RECEIPT ====================

	// A running status duration already counts the running log up to the moment it was read, so
	// useLiveTimerStatus adds only the time elapsed since the status arrived
	useEffect(() => {
		if (firstLoad) {
			const receivedAt = Date.now();
			setTimerStatusReceipt({ status: timerStatus, receivedAt });
		}
	}, [firstLoad, timerStatus, setTimerStatusReceipt]);

	// ==================== RETURN ====================

	return {
		timeCounter,
		timerSeconds,
		fomatedTimeCounter: convertMsToTime(timeCounter)
	};
}

// ==================== STANDALONE HOOKS ====================

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
