'use client';

import { useQuery } from '@tanstack/react-query';
import { startOfLog } from '@/core/lib/utils/dashboards/timesheets';
import { type ApiSplitSupport, apiSplitSupportOf } from '@/core/lib/utils/time-log-split';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

/** Whether the API splits an entry in one write: being checked, yes, no, or not known (the check failed). */
export type SplitSupport = 'checking' | ApiSplitSupport | 'unknown';

/** One check per API for the whole session: whether it splits does not change while the page is open. */
const SPLIT_SUPPORT_KEY = ['time-log-split', 'support'] as const;

/**
 * Asks the API whether it splits an entry (ever-co/ever-gauzy#12030) with a split it refuses before writing
 * anything: at the very start of the entry, which leaves no first part. Its own refusal says it splits; the 404 of a
 * missing route says it does not.
 */
export async function checkSplitSupport(log: ITimeLog): Promise<ApiSplitSupport> {
	const start = startOfLog(log);
	if (!start) {
		throw new Error('An entry without a start cannot be checked');
	}
	try {
		await timeLogService.splitTimeLog({ timeLogId: log.id, splitAt: start });
	} catch (error) {
		return apiSplitSupportOf(error);
	}
	// An answer that refuses nothing comes from an API that has the route
	return 'supported';
}

/** Whether the API splits entries, checked once with the entry the dialog opens on, when `enabled`. */
export function useTimeLogSplitSupport(log: ITimeLog | null, enabled: boolean): SplitSupport {
	const isEnabled = enabled && log !== null;
	const query = useQuery({
		queryKey: SPLIT_SUPPORT_KEY,
		queryFn: () => checkSplitSupport(log as ITimeLog),
		enabled: isEnabled,
		staleTime: Infinity,
		gcTime: Infinity,
		retry: false
	});
	if (query.data) {
		return query.data;
	}
	if (query.isError) {
		return 'unknown';
	}
	return 'checking';
}
