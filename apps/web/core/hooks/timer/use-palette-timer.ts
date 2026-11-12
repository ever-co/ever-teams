'use client';

import { useCallback, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useModal } from '@/core/hooks/common/use-modal';
import { useTimerPlanStatus } from '@/core/hooks/timer/use-timer-plan-status';
import { canStopFromPalette } from '@/core/lib/utils/timer/palette-timer';
import { timerStatusFetchingState } from '@/core/stores';
import { teamTimerStatusState } from '@/core/stores/timer/team-timer-status';
import type { TTask } from '@/core/types/schemas/task/task.schema';

type PaletteTimerRequest = { id: number; kind: 'stop' } | { id: number; kind: 'start'; task: TTask };

function nextRequestIdOf(current: PaletteTimerRequest | null) {
	if (!current) {
		return 1;
	}
	return current.id + 1;
}

/**
 * What the command palette does with the timer. A start or a stop asked here is handed to `PaletteTimerLayer`, which
 * runs it through the hooks of the timer's own buttons, so the palette adds no rule of its own.
 */
export function usePaletteTimer() {
	const [request, setRequest] = useState<PaletteTimerRequest | null>(null);
	const addTimeModal = useModal();
	const { canRunTimer } = useTimerPlanStatus();
	const isTimerRequestPending = useAtomValue(timerStatusFetchingState);
	// The run the timer shows: a run of another team is hidden there, and the timer's Stop only warns about it
	const isTimerRunning = useAtomValue(teamTimerStatusState)?.running === true;
	// The timer's buttons are disabled while a timer request is in flight, and the main Start would discard a start
	// asked then: the palette does not offer what they refuse
	const canStart = !isTimerRequestPending;
	const canStop = canStopFromPalette({ isTimerRunning, canRunTimer, isTimerRequestPending });

	const stopTimer = useCallback(() => {
		setRequest((current) => ({ id: nextRequestIdOf(current), kind: 'stop' }));
	}, []);

	const startTimerOn = useCallback((task: TTask) => {
		setRequest((current) => ({ id: nextRequestIdOf(current), kind: 'start', task }));
	}, []);

	return { canStart, canStop, stopTimer, startTimerOn, openAddTime: addTimeModal.openModal, request, addTimeModal };
}
