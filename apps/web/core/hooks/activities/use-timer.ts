'use client';

import { useAtomValue } from 'jotai';
import { activeTeamIdState, timerSecondsState } from '@/core/stores';
import { useFirstLoad } from '../common/use-first-load';
import { useTaskStatistics } from '../tasks/use-task-statistics';
import { useTimerApi } from '../timer/use-timer-api';
import { useTimerStorage } from '../timer/use-timer-storage';
import { useTimerUi } from '../timer/use-timer-ui';
import type { ApiRequestScope } from '@/core/services/client/api-request-scope';

// Re-exported from the timer module for backward compatibility
export { useLiveTimerStatus, useTimerClock } from '../timer/use-timer-ui';

/**
 * Composite timer hook — Full 3-layer facade.
 *
 * Composes all three layers (API + Storage + UI) with proper firstLoad lifecycle.
 * Use this hook when you own the timer runtime (the **firstLoad bootstrap**, `firstLoadTimerData`) or
 * need its mutations and derived state. It never re-renders on the clock ticks: the digits come from
 * `useTimerClock`, mounted where they are displayed.
 *
 * For lighter alternatives, prefer:
 * - `useTimerActions`    — Mutations + derived state, NO ticking (from '@/core/hooks/timer')
 * - `useTimerPlanStatus` — Read-only plan state, NO mutations (from '@/core/hooks/timer')
 * - `useLiveTimerStatus` — Lightweight live timer display (from '@/core/hooks/timer')
 * - `useTimerClock`      — The 50ms digits alone (from '@/core/hooks/timer')
 */
interface UseTimerOptions {
	enabled?: boolean;
	scope?: ApiRequestScope;
	statusEnabled?: boolean;
	statusRefetchInterval?: number | false;
	plansEnabled?: boolean;
	plansRefetchInterval?: number | false;
	manageRuntime?: boolean;
}

export function useTimer(options: UseTimerOptions = {}) {
	const { firstLoad, firstLoadData: firstLoadTimerData } = useFirstLoad();
	const activeTeamId = useAtomValue(activeTeamIdState);

	// Layer 2: Local Persistence — "The Memory"
	const storage = useTimerStorage({ firstLoad, activeTeamId });

	// Layer 1: Core Data & Mutations — "The Brain"
	const api = useTimerApi({
		updateLocalTimerStatus: storage.updateLocalTimerStatus,
		firstLoad,
		...options
	});

	// Layer 3: UI & Animation — "The Face" (drives the atoms, subscribes to none of them)
	useTimerUi({
		firstLoad,
		activeTeamTask: api.activeTeamTask
	});

	return {
		// From API layer
		timerStatusFetching: api.timerStatusFetching,
		getTimerStatus: api.getTimerStatus,
		loading: api.loading,
		timerStatus: api.timerStatus,
		startTimer: api.startTimer,
		stopTimer: api.stopTimer,
		toggleTimer: api.toggleTimer,
		syncTimer: api.syncTimer,
		syncTimerLoading: api.syncTimerLoading,
		hasPlan: api.hasPlan,
		hasPlanForTomorrow: api.hasPlanForTomorrow,
		canRunTimer: api.canRunTimer,
		canTrack: api.canTrack,
		isPlanVerified: api.isPlanVerified,
		activeTeamTask: api.activeTeamTask,
		rawTimerRunning: api.rawTimerRunning,
		statusResolved: api.statusResolved,
		plansResolved: api.plansResolved,
		// From composite (useFirstLoad is local state, must live here)
		firstLoad,
		firstLoadTimerData
	};
}

/**
 * It returns the timer's state and the function to start/stop the timer
 */
export function useTimerView() {
	const {
		timerStatus,
		timerStatusFetching,
		startTimer,
		stopTimer,
		hasPlan,
		hasPlanForTomorrow,
		canRunTimer,
		canTrack,
		isPlanVerified,
		activeTeamTask,
		syncTimerLoading
	} = useTimer();

	return {
		canRunTimer,
		timerStatusFetching,
		timerStatus,
		activeTeamTask,
		hasPlan,
		hasPlanForTomorrow,
		disabled: !canRunTimer,
		canTrack,
		isPlanVerified,
		startTimer,
		stopTimer,
		syncTimerLoading
	};
}

/**
 * The active task's estimation progress, which moves with the timer once per second. Mount it in the progress bar
 * alone, so the timer around it does not re-render every second.
 */
export function useActiveTaskEstimation() {
	const timerSeconds = useAtomValue(timerSecondsState);
	const { activeTaskEstimation } = useTaskStatistics(timerSeconds);
	return activeTaskEstimation;
}
