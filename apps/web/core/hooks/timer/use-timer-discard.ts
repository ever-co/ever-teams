'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { useGetCurrentOrganization } from '@/core/hooks/auth/use-current-organization';
import { queryKeys } from '@/core/query/keys';
import { timerService } from '@/core/services/client/api/timers/timer.service';
import { timerStatusState } from '@/core/stores';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import {
	type TimerDiscardFailure,
	timerDiscardAvailabilityOf,
	timerDiscardFailureOf
} from '@/core/lib/utils/timer/timer-discard';

/** The current organization read: invalidated when the API says its discard settings refuse the discard. */
const CURRENT_ORGANIZATION_QUERY_PREFIX = ['workspaces', 'current-organization-scope'] as const;

/** Failures that mean the timer, or the organization's settings, are no longer what this tab shows. */
const STALE_TIMER_FAILURES: ReadonlySet<string> = new Set<TimerDiscardFailure>(['NOT_RUNNING', 'CHANGED']);
const STALE_SETTINGS_FAILURES: ReadonlySet<string> = new Set<TimerDiscardFailure>(['DISABLED', 'TOO_LATE']);

function startedAtOf(startedAt: Date | string | undefined): number | null {
	if (!startedAt) {
		return null;
	}
	const time = new Date(startedAt).getTime();
	if (Number.isNaN(time)) {
		return null;
	}
	return time;
}

/**
 * The Discard of the running timer (#5219): whether the running timer offers it (the organization's switch and age
 * limit, an API that knows the discard), and the discard itself. A discard names the run the member confirmed
 * (`runningLogId` when the confirmation opened), so a run started meanwhile elsewhere is never removed. On success the timer reads the stopped status the API answers, and
 * every view that counts time reads again; on a refusal the timer stays as it is and `failure` names the reason.
 */
export function useTimerDiscard() {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const [timerStatus, setTimerStatus] = useAtom(timerStatusState);
	const running = Boolean(timerStatus?.running);
	// Read here: the timer lives on pages (the home page among them) that never read the organization otherwise
	useGetCurrentOrganization({ enabled: running });
	const organization = useAtomValue(currentOrganizationState);
	const [discarding, setDiscarding] = useState(false);
	const [failure, setFailure] = useState<TimerDiscardFailure | null>(null);
	// Bumped when the organization's age limit closes the offer, so the availability is read again then.
	const [, setLimitPassed] = useState(0);

	const runningLog = timerStatus?.lastLog;
	const startedAt = startedAtOf(runningLog?.startedAt);
	const availability = timerDiscardAvailabilityOf({ organization, running, startedAt, now: Date.now() });
	const closesAt = availability.available ? availability.closesAt : null;

	useEffect(() => {
		if (closesAt === null) {
			return undefined;
		}
		const timeout = setTimeout(() => setLimitPassed((count) => count + 1), Math.max(0, closesAt - Date.now()));
		return () => clearTimeout(timeout);
	}, [closesAt]);

	const refreshAfter = useCallback(
		(reason: TimerDiscardFailure | 'DISCARDED') => {
			const timerChanged = reason === 'DISCARDED' || STALE_TIMER_FAILURES.has(reason);
			if (timerChanged) {
				void queryClient.invalidateQueries({ queryKey: queryKeys.timer.all });
				void queryClient.invalidateQueries({ queryKey: queryKeys.organizationTeams.all });
			}
			if (reason === 'DISCARDED') {
				void queryClient.invalidateQueries({ queryKey: queryKeys.activities.all });
				void queryClient.invalidateQueries({ queryKey: queryKeys.timesheet.all });
			}
			if (STALE_SETTINGS_FAILURES.has(reason)) {
				void queryClient.invalidateQueries({ queryKey: CURRENT_ORGANIZATION_QUERY_PREFIX });
			}
		},
		[queryClient]
	);

	const discard = useCallback(
		async (timeLogId: string | undefined): Promise<boolean> => {
			if (discarding) {
				return false;
			}
			setDiscarding(true);
			setFailure(null);
			try {
				const { data } = await timerService.discardTimer({ timeLogId });
				if (data) {
					setTimerStatus(data);
				}
				refreshAfter('DISCARDED');
				toast.success(t('timer.discard.DISCARDED'), { description: t('timer.discard.DISCARDED_HINT') });
				return true;
			} catch (error) {
				const reason = timerDiscardFailureOf(error);
				setFailure(reason);
				refreshAfter(reason);
				return false;
			} finally {
				setDiscarding(false);
			}
		},
		[discarding, refreshAfter, setTimerStatus, t]
	);

	const resetFailure = useCallback(() => setFailure(null), []);

	return {
		availability,
		runningLogId: runningLog?.id,
		runningSource: runningLog?.source,
		discard,
		discarding,
		failure,
		resetFailure
	};
}
