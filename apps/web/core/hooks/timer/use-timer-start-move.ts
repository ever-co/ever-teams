'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { useCallback } from 'react';
import { trackTimerCommand } from '@/core/hooks/timer/use-timer-api';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { queryKeys } from '@/core/query/keys';
import { timerService } from '@/core/services/client/api/timers/timer.service';
import { timerStatusState } from '@/core/stores/timer/timer';
import type { TimerStartMoveSupport } from '@/core/lib/utils/timer/timer-start-move';

/** Whether the API behind the app can move a running start: asked once per session. */
const TIMER_START_MOVE_SUPPORT_KEY = ['timer-start-move-support'] as const;

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

/** The workspace a request belongs to, read from the session's cookies. */
function workspaceScope() {
	return `${getTenantIdCookie() ?? ''}:${getOrganizationIdCookie() ?? ''}`;
}

/**
 * Moves the start of the caller's running timer. The status Gauzy answers after the move replaces the one the timer
 * shows, so the clock jumps at once; the team's figures are read again for today's total. A refusal leaves the timer
 * as it was and is thrown to the caller, which says why. The move counts as a timer command, so a status read before
 * it lands (a heartbeat) cannot put the old start back, and an answer that lands after the workspace changed is
 * dropped.
 */
export function useMoveTimerStart() {
	const queryClient = useQueryClient();
	const setTimerStatus = useSetAtom(timerStatusState);

	const mutation = useMutation({
		mutationFn: async ({ move, scope }: { move: TimerStartMove; scope: string }) => {
			const response = await trackTimerCommand(timerService.moveTimerStart(move));
			return { response, sameWorkspace: workspaceScope() === scope };
		},
		onSuccess: ({ response, sameWorkspace }) => {
			if (!sameWorkspace) {
				return;
			}
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

	// The workspace is read when Save is pressed, before anything is awaited
	const { mutateAsync } = mutation;
	const moveStart = useCallback(
		(move: TimerStartMove) => mutateAsync({ move, scope: workspaceScope() }),
		[mutateAsync]
	);

	return { moveStart, saving: mutation.isPending, reset: mutation.reset };
}
