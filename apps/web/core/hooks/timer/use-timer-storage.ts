'use client';

import { useAtom, useAtomValue } from 'jotai';
import moment from 'moment';
import { useCallback, useEffect } from 'react';

import { getLocalTimerStorageKey } from '@/core/lib/helpers/timer';
import { localTimerStatusState, timerStatusState } from '@/core/stores';
import { ILocalTimerStatus } from '@/core/types/interfaces/timer/timer-status';

import { useSyncRef } from '../common/use-sync-ref';

// ==================== TYPES ====================

export interface UseTimerStorageParams {
	/** Whether the initial data load has completed */
	firstLoad: boolean;
	/** The active team ID (used for team-scoped localStorage keys) */
	activeTeamId?: string | null;
}

export interface UseTimerStorageReturn {
	/** The current local timer status (from Jotai atom, synced with localStorage) */
	localTimerStatus: ILocalTimerStatus | null;
	/** Update both localStorage and Jotai atom with the new timer status */
	updateLocalTimerStatus: (status: ILocalTimerStatus) => void;
	/** Read the timer status from localStorage (without updating state) */
	getLocalCounterStatus: () => ILocalTimerStatus | null;
}

// ==================== HOOK ====================

/**
 * Layer 2: Local Persistence — "The Memory"
 *
 * Manages the client-side timer state persistence through localStorage
 * and the Jotai `localTimerStatusState` atom.
 *
 * Responsibilities:
 * - Read/write timer status to localStorage (team-scoped keys)
 * - Keep the Jotai `localTimerStatusState` atom in sync with localStorage
 * - On first load, sync server timerStatus → localStorage → atom
 *
 * This hook does NOT manage:
 * - High-frequency ticking (→ useTimerUi)
 * - API calls or business logic (→ useTimerApi)
 */
export function useTimerStorage({ firstLoad, activeTeamId }: UseTimerStorageParams): UseTimerStorageReturn {
	const [localTimerStatus, setLocalTimerStatus] = useAtom(localTimerStatusState);
	const timerStatus = useAtomValue(timerStatusState);
	const timerStatusRef = useSyncRef(timerStatus);

	// ==================== STORAGE OPERATIONS ====================

	/**
	 * Write status to localStorage (low-level, no atom update)
	 */
	const updateLocalStorage = useCallback(
		(status: ILocalTimerStatus) => {
			try {
				localStorage.setItem(getLocalTimerStorageKey(activeTeamId), JSON.stringify(status));
			} catch (error) {
				console.error('Failed to persist timer status to localStorage:', error);
			}
		},
		[activeTeamId]
	);

	/**
	 * Write status to both localStorage AND the Jotai atom.
	 * Order matters: localStorage first, then atom (so subscribers read consistent data).
	 */
	const updateLocalTimerStatus = useCallback(
		(status: ILocalTimerStatus) => {
			updateLocalStorage(status);
			setLocalTimerStatus(status);
		},
		[updateLocalStorage, setLocalTimerStatus]
	);

	/**
	 * Read the timer status from localStorage (parse-safe).
	 */
	const getLocalCounterStatus = useCallback(() => {
		let data: ILocalTimerStatus | null = null;
		try {
			data = JSON.parse(localStorage.getItem(getLocalTimerStorageKey(activeTeamId)) || 'null');
		} catch (error) {
			console.log(error);
		}
		return data;
	}, [activeTeamId]);

	// ==================== FIRST-LOAD SYNC EFFECT ====================

	/**
	 * On first load, synchronize the server timerStatus with localStorage and the atom.
	 *
	 * Flow:
	 * 1. Read existing localStorage data (to preserve runnedDateTime if available)
	 * 2. Merge server timerStatus into localStorage
	 * 3. Update the Jotai atom
	 *
	 * This ensures the UI can immediately render the correct timer state
	 * even before the next API poll completes.
	 */
	useEffect(() => {
		if (!firstLoad) return;

		const localStatus = getLocalCounterStatus();
		if (localStatus) {
			setLocalTimerStatus(localStatus);
		}

		const timerStatusDate = timerStatusRef.current?.lastLog?.createdAt
			? moment(timerStatusRef.current.lastLog.createdAt).unix() * 1000 -
				(timerStatusRef.current.lastLog.duration ?? 0)
			: 0;

		if (timerStatusRef.current) {
			updateLocalTimerStatus({
				runnedDateTime:
					(timerStatusRef.current.running ? timerStatusDate || Date.now() : 0) ||
					localStatus?.runnedDateTime ||
					0,
				running: timerStatusRef.current.running || false,
				lastTaskId: timerStatusRef.current.lastLog?.taskId || null
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [firstLoad, timerStatus]);

	// ==================== RETURN ====================

	return {
		localTimerStatus,
		updateLocalTimerStatus,
		getLocalCounterStatus
	};
}
