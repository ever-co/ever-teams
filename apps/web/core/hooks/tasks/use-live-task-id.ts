'use client';

import { useAtomValue } from 'jotai';
import { activeTeamTaskState } from '@/core/stores';
import { teamTimerStatusState } from '@/core/stores/timer/team-timer-status';

export function useLiveTaskId() {
	const activeTeamTask = useAtomValue(activeTeamTaskState);
	const timerStatus = useAtomValue(teamTimerStatusState);
	const isRunning = Boolean(timerStatus?.running);
	if (!isRunning) {
		return null;
	}
	return activeTeamTask?.id ?? null;
}
