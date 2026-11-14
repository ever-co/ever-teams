'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { queryKeys } from '@/core/query/keys';
import { timerService } from '@/core/services/client/api/timers/timer.service';
import { timerStatusState } from '@/core/stores/timer/timer';
import type { TimerStartMoveSupport } from '@/core/lib/utils/timer/timer-start-move';

/** Whether the API behind the app can move a running start: asked once per session. */
export const TIMER_START_MOVE_SUPPORT_KEY = ['timer-start-move-support'] as const;

/**
 * Whether the API can move the start of a running timer. It is asked the first time `enabled` is true (the panel
 * opens), once per session; `checking` until it answers.
 */
export function useTimerStartMoveSupport(enabled: boolean): TimerStartMoveSupport {
	const { data } = useQuery({
		queryKey: TIMER_START_MOVE_SUPPORT_KEY,
		queryFn: () => timerService.getTimerStartMoveSupport(),
		enabled,
		staleTime: Infinity,
		gcTime: Infinity,
		retry: false
	});
	if (data) {
		return data;
	}
	return 'checking';
}

interface TimerStartMove {
	startedAt: Date;
	reason?: string;
}

/**
 * Moves the start of the caller's running timer. The status Gauzy answers after the move replaces the one the timer
 * shows, so the clock jumps at once; the team's figures are read again for today's total. A refusal leaves the timer
 * as it was and is thrown to the caller, which says why.
 */
export function useMoveTimerStart() {
	const queryClient = useQueryClient();
	const setTimerStatus = useSetAtom(timerStatusState);

	const mutation = useMutation({
		mutationFn: (move: TimerStartMove) => timerService.moveTimerStart(move),
		onSuccess: (response) => {
			const status = response?.data;
			if (status) {
				setTimerStatus(status);
			}
			void queryClient.invalidateQueries({ queryKey: queryKeys.timer.all });
			void queryClient.invalidateQueries({ queryKey: queryKeys.organizationTeams.all });
		},
		onError: (error: unknown) => {
			const routeIsMissing = (error as { statusCode?: number } | null)?.statusCode === 404;
			if (routeIsMissing) {
				queryClient.setQueryData<TimerStartMoveSupport>(TIMER_START_MOVE_SUPPORT_KEY, 'unsupported');
			}
		}
	});

	return { moveStart: mutation.mutateAsync, saving: mutation.isPending, reset: mutation.reset };
}
