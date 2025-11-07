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
	 * - Propagates errors to caller so they can handle stop failures
	 */
	const handleStop = useCallback(async () => {
		if (!onStop) return;

		// Optimistic UI: immediately show button as stopped
		setOptimisticRunning(false);

		try {
			await onStop();
		} catch (error) {
			// Reset optimistic state before propagating error
			setOptimisticRunning(null);
			// Propagate error to caller so they can handle stop failures
			// This prevents starting a new timer when stop failed
			console.error('Failed to stop timer:', error);
			throw error;
		} finally {
			// Always reset optimistic state when done
			setOptimisticRunning(null);
		}
	}, [onStop]);

	/**
	 * Handle starting timer with optimistic UI
	 * - Immediately set optimistic state to true
	 * - Call onStart callback in background
	 * - Reset optimistic state when done
	 * - Propagates errors to caller so they can handle start failures
	 */
	const handleStart = useCallback(async () => {
		if (!onStart) return;

		// Optimistic UI: immediately show button as running
		setOptimisticRunning(true);

		try {
			await onStart();
		} catch (error) {
			// Reset optimistic state before propagating error
			setOptimisticRunning(null);
			// Propagate error to caller so they can handle start failures
			console.error('Failed to start timer:', error);
			throw error;
		} finally {
			// Always reset optimistic state when done
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
