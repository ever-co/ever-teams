'use client';

import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';

import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { queryKeys } from '@/core/query/keys';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import { shellSettledState } from '@/core/stores/common/shell';

export interface EntryLabelsSupport {
	/** The API stores labels on entries. */
	isSupported: boolean;
	/** The answer is in: read, given up on after its retries, or not asked for want of a workspace. */
	isKnown: boolean;
}

/**
 * Whether entries can carry labels of their own (Gauzy #12029), and whether that is known yet. Asked once per workspace.
 * Until the answer comes, and against an API without them, every label control stays away and nothing is sent that the
 * API would refuse, so the app works as before.
 * The timer that offers Labels is in the shell of every page, so the question waits for the shell to settle (shell.ts):
 * asked on mount, it would be one more Gauzy read before the shell is ready (startup-performance.cy.ts).
 */
export function useEntryLabelsSupportState(): EntryLabelsSupport {
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();
	const hasWorkspace = Boolean(tenantId) && Boolean(organizationId);
	const shellSettled = useAtomValue(shellSettledState);
	const { data, isError } = useQuery({
		queryKey: queryKeys.timeLogs.entryLabelsSupport(tenantId, organizationId),
		queryFn: () => timeLogService.supportsEntryLabels(),
		enabled: hasWorkspace && shellSettled,
		// An answer holds for the session; a failure to read it is tried again, so labels return with the API
		staleTime: Infinity,
		gcTime: Infinity,
		retry: 3
	});
	const isAnswered = data !== undefined;
	const isKnown = isAnswered || isError || !hasWorkspace;
	return { isSupported: data === true, isKnown };
}

/** Whether entries can carry labels of their own: see `useEntryLabelsSupportState`. */
export function useEntryLabelsSupport(): boolean {
	return useEntryLabelsSupportState().isSupported;
}
