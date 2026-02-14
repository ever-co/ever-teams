'use client';

import { useAtom, useAtomValue } from 'jotai';
import { useEffect, useMemo, useRef } from 'react';

import { convertMsToTime, secondsToTime } from '@/core/lib/helpers/date-and-time';
import {
    localTimerStatusState, timeCounterIntervalState, timeCounterState, timerSecondsState,
    timerStatusState
} from '@/core/stores';
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

	// ==================== RETURN ====================

	return {
		timeCounter,
		timerSeconds,
		fomatedTimeCounter: convertMsToTime(timeCounter)
	};
}

// ==================== STANDALONE HOOKS ====================

/**
 * Lightweight hook for components that only need the live timer display.
 * Does NOT trigger high-frequency re-renders from the ticking interval —
 * it reads the `timerSecondsState` atom which updates once per second.
 */
export function useLiveTimerStatus() {
	const seconds = useAtomValue(timerSecondsState);
	const timerStatus = useAtomValue(timerStatusState);
	const { hours: h, minutes: m } = secondsToTime((timerStatus?.duration || 0) + seconds);

	return {
		time: { h, m },
		seconds,
		timerStatus
	};
}
