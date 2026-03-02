'use client';

import { useAtomValue } from 'jotai';
import { timerStatusState, activeTeamIdState } from '@/core/stores';
import { useFirstLoad } from '../common/use-first-load';
import { useTaskStatistics } from '../tasks/use-task-statistics';
import { useRefreshIntervalV2 } from '../common';
import { useTimerPolling } from './use-timer-polling';
import { useTimerApi, useTimerStorage, useTimerUi } from '../timer';
import { REFRESH_INTERVAL } from '@/core/constants/config/constants';

// Re-export useLiveTimerStatus from the new timer module for backward compatibility
export { useLiveTimerStatus } from '../timer';

/**
 * Composite timer hook — Full 3-layer facade.
 *
 * Composes all three layers (API + Storage + UI) with proper firstLoad lifecycle.
 * Use this hook when you need the **live ticking clock** (fomatedTimeCounter, timerSeconds)
 * or the **firstLoad bootstrap** (firstLoadTimerData).
 *
 * For lighter alternatives, prefer:
 * - `useTimerActions`    — Mutations + derived state, NO ticking (from '@/core/hooks/timer')
 * - `useTimerPlanStatus` — Read-only plan state, NO mutations (from '@/core/hooks/timer')
 * - `useLiveTimerStatus` — Lightweight live timer display (from '@/core/hooks/timer')
 */
export function useTimer() {
	const { firstLoad, firstLoadData: firstLoadTimerData } = useFirstLoad();
	const activeTeamId = useAtomValue(activeTeamIdState);

	// Layer 2: Local Persistence — "The Memory"
	const storage = useTimerStorage({ firstLoad, activeTeamId });

	// Layer 1: Core Data & Mutations — "The Brain"
	const api = useTimerApi({
		updateLocalTimerStatus: storage.updateLocalTimerStatus,
		firstLoad
	});

	// Layer 3: UI & Animation — "The Face"
	const ui = useTimerUi({
		firstLoad,
		activeTeamTask: api.activeTeamTask
	});

	return {
		// From UI layer
		timeCounter: ui.timeCounter,
		fomatedTimeCounter: ui.fomatedTimeCounter,
		timerSeconds: ui.timerSeconds,
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
		fomatedTimeCounter: { hours, minutes, seconds, ms_p },
		timerStatus,
		timerStatusFetching,
		startTimer,
		stopTimer,
		hasPlan,
		hasPlanForTomorrow,
		canRunTimer,
		canTrack,
		isPlanVerified,
		timerSeconds,
		activeTeamTask,
		syncTimerLoading
	} = useTimer();

	const { activeTaskEstimation } = useTaskStatistics(timerSeconds);

	const timerHanlder = () => {
		if (timerStatusFetching || !canRunTimer) return;
		if (timerStatus?.running) {
			stopTimer();
		} else {
			startTimer();
		}
	};

	return {
		hours,
		minutes,
		seconds,
		ms_p,
		activeTaskEstimation,
		timerHanlder,
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

export function useSyncTimer() {
	const { syncTimer } = useTimer();
	const timerStatus = useAtomValue(timerStatusState);

	// Enable real-time polling of team data when timer is active
	// This ensures all team members see updated statuses (Working/Pause/Not Working) in real-time
	// Note: This hook is called only once in init-state.tsx, so we have a single polling instance
	useTimerPolling(timerStatus?.running ?? false);

	useRefreshIntervalV2(timerStatus?.running ? syncTimer : () => void 0, REFRESH_INTERVAL);
}
