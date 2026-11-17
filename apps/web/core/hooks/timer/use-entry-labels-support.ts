'use client';

import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';

import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { queryKeys } from '@/core/query/keys';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import { shellSettledState } from '@/core/stores/common/shell';
import { timerStatusState } from '@/core/stores/timer/timer';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';

interface EntryLabelsSupport {
	/** The API stores labels on entries. */
	isSupported: boolean;
	/** The answer is in: read, given up on after its retries, or not asked for want of a workspace. */
	isKnown: boolean;
}

/**
 * What the timer's status says about labels on entries, or `undefined` when it cannot say. An API with them sends the
 * last entry with its labels, an empty list too (Gauzy #12037, `loadTimeLogTags`); one without them sends the entry with
 * no `tags` at all. With no last entry (nothing tracked yet, or the status not read) it says nothing.
 */
function entryLabelsSupportOfStatus(status: ITimerStatus | null | undefined): boolean | undefined {
	const lastLog = status?.lastLog;
	if (!lastLog) {
		return undefined;
	}
	return Array.isArray((lastLog as { tags?: unknown }).tags);
}

/**
 * Whether entries can carry labels of their own (Gauzy #12029), and whether that is known yet. Known once per workspace.
 * Until the answer comes, and against an API without them, every label control stays away and nothing is sent that the
 * API would refuse, so the app works as before.
 * The timer's status, which every page's shell reads, answers it whenever there is a last entry, so most page loads ask
 * Gauzy nothing more. Only with no last entry is Gauzy asked (`supportsEntryLabels`, a time-log list read), and only
 * once the shell has settled (shell.ts): the cold-start budget (startup-performance.cy.ts) refuses time-log list reads
 * in its window, and counts every read that starts before the shell is ready.
 */
export function useEntryLabelsSupportState(): EntryLabelsSupport {
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();
	const hasWorkspace = Boolean(tenantId) && Boolean(organizationId);
	const shellSettled = useAtomValue(shellSettledState);
	const timerStatus = useAtomValue(timerStatusState);
	const queryClient = useQueryClient();
	const queryKey = useMemo(
		() => queryKeys.timeLogs.entryLabelsSupport(tenantId, organizationId),
		[tenantId, organizationId]
	);
	const answerOfStatus = entryLabelsSupportOfStatus(timerStatus);

	// The first status that answers is kept for the session, as a read would be: a status the app writes itself later
	// (after a stop, a discard) may not carry the entry's labels, and must not take them away
	useEffect(() => {
		if (!hasWorkspace || answerOfStatus === undefined) {
			return;
		}
		if (queryClient.getQueryData(queryKey) !== undefined) {
			return;
		}
		queryClient.setQueryData(queryKey, answerOfStatus);
	}, [answerOfStatus, hasWorkspace, queryClient, queryKey]);

	const { data, isError } = useQuery({
		queryKey,
		queryFn: () => timeLogService.supportsEntryLabels(),
		enabled: hasWorkspace && shellSettled && answerOfStatus === undefined,
		// An answer holds for the session; a failure to read it is tried again, so labels return with the API
		staleTime: Infinity,
		gcTime: Infinity,
		retry: 3
	});
	// Outside a workspace the status says nothing for it: no answer, known at once, every label control away
	const answer = data ?? (hasWorkspace ? answerOfStatus : undefined);
	const isKnown = answer !== undefined || isError || !hasWorkspace;
	return { isSupported: answer === true, isKnown };
}

/** Whether entries can carry labels of their own: see `useEntryLabelsSupportState`. */
export function useEntryLabelsSupport(): boolean {
	return useEntryLabelsSupportState().isSupported;
}
