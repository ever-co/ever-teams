'use client';

import { useAtomValue } from 'jotai';
import { activeTeamIdState } from '@/core/stores';
import { useTimerStorage } from './use-timer-storage';
import { useTimerApi } from './use-timer-api';
import type { UseTimerApiReturn } from './use-timer-api';

// ==================== TYPES ====================

/**
 * Return type of useTimerActions.
 * Same as UseTimerApiReturn — exposes all mutations + derived state from the API layer.
 */
export type UseTimerActionsReturn = UseTimerApiReturn;

// ==================== HOOK ====================

/**
 * Mutation-oriented timer hook — "The Hands"
 *
 * Composes Layer 1 (API) + Layer 2 (Storage) WITHOUT Layer 3 (UI ticking).
 * Designed for components that need to START/STOP the timer or read derived state
 * (hasPlan, canRunTimer, timerStatus…) but do NOT display the live clock.
 *
 * How it works:
 * - Instantiates useTimerStorage and useTimerApi with `firstLoad = false`
 * - Mutations (startTimer, stopTimer…) work because they have NO firstLoad guard
 * - updateLocalTimerStatus writes to the SAME shared Jotai atoms + localStorage
 * - Side effects (sync interval, team/task change detection) are handled by the
 *   primary useTimer() instance in init-state.tsx (which has firstLoad = true)
 *
 * Performance gain:
 * - No 50ms ticking interval (useTimerUi is NOT instantiated)
 * - No localStorage first-load sync effect
 * - No sync timer interval
 * - No team/task change detection effects
 *
 * Use cases:
 * - use-start-stop-timer-handler.ts (startTimer, stopTimer, hasPlan, canRunTimer)
 * - use-active-team.ts (stopTimer, timerStatus)
 * - daily-plan-compare-estimate-modal.tsx (startTimer)
 *
 * @see useTimer for the full composite (all 3 layers + firstLoad)
 * @see useTimerPlanStatus for read-only plan state (even lighter)
 */
export function useTimerActions(): UseTimerActionsReturn {
	const activeTeamId = useAtomValue(activeTeamIdState);

	// Layer 2: Storage — needed so mutations can update localStorage + atom
	const { updateLocalTimerStatus } = useTimerStorage({
		firstLoad: false,
		activeTeamId
	});

	// Layer 1: API — mutations + derived state (effects gated by firstLoad won't fire)
	const api = useTimerApi({
		updateLocalTimerStatus,
		firstLoad: false
	});

	return api;
}

