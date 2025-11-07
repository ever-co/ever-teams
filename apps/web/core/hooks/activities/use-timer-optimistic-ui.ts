import { useState, useCallback } from 'react';

/**
 * Hook for managing optimistic UI state for timer buttons
 * Provides immediate visual feedback while API calls execute in background
 *
 * Usage:
 * const { optimisticRunning, handleStop, handleStart } = useTimerOptimisticUI({
 *   onStop: async () => await stopTimer(),
 *   onStart: async () => await startTimer()
 * });
 *
 * Then use optimisticRunning for display and call handleStop/handleStart on user action
 */
export function useTimerOptimisticUI({
	onStop,
	onStart
}: {
	onStop?: () => Promise<void>;
	onStart?: () => Promise<void>;
}) {
	// Optimistic UI state: null means use real state, true/false means use optimistic state
	const [optimisticRunning, setOptimisticRunning] = useState<boolean | null>(null);

	/**
	 * Handle stopping timer with optimistic UI
	 * - Immediately set optimistic state to false
	 * - Call onStop callback in background
	 * - Reset optimistic state when done
	 */
	const handleStop = useCallback(async () => {
		if (!onStop) return;

		// Optimistic UI: immediately show button as stopped
		setOptimisticRunning(false);

		try {
			await onStop();
		} catch (error) {
			// On error, reset to real state (will be updated by Jotai)
			console.error('Failed to stop timer:', error);
		} finally {
			// Reset optimistic state to use real state from Jotai
			setOptimisticRunning(null);
		}
	}, [onStop]);

	/**
	 * Handle starting timer with optimistic UI
	 * - Immediately set optimistic state to true
	 * - Call onStart callback in background
	 * - Reset optimistic state when done
	 */
	const handleStart = useCallback(async () => {
		if (!onStart) return;

		// Optimistic UI: immediately show button as running
		setOptimisticRunning(true);

		try {
			await onStart();
		} catch (error) {
			// On error, reset to real state (will be updated by Jotai)
			console.error('Failed to start timer:', error);
		} finally {
			// Reset optimistic state to use real state from Jotai
			setOptimisticRunning(null);
		}
	}, [onStart]);

	/**
	 * Reset optimistic state to use real state
	 * Useful when component unmounts or state needs to be reset
	 */
	const resetOptimisticState = useCallback(() => {
		setOptimisticRunning(null);
	}, []);

	return {
		optimisticRunning,
		handleStop,
		handleStart,
		resetOptimisticState
	};
}

