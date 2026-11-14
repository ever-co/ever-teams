'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { historyChangesOf, type TimeLogHistoryChange } from '@/core/lib/utils/time-log-history';
import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import { timeLogHistoryService } from '@/core/services/client/api/timesheets/time-log-history.service';

/** What a history read can show: rows, nothing to show yet, a refusal, a failure, or an API without history. */
export type HistoryState =
	| { status: 'loading' }
	| { status: 'unsupported' }
	| { status: 'forbidden' }
	| { status: 'error' }
	| { status: 'ready'; changes: TimeLogHistoryChange[] };

const FORBIDDEN = 403;

const HISTORY_STALE_MS = 30_000;

interface EntryHistoryResult {
	isSupported: boolean;
	changes: TimeLogHistoryChange[];
}

async function readEntryHistory(entryId: string): Promise<EntryHistoryResult> {
	const read = await timeLogHistoryService.getEntryHistory(entryId);
	if (read.kind === 'unsupported') {
		return { isSupported: false, changes: [] };
	}
	return { isSupported: true, changes: historyChangesOf(read.value) };
}

/** The history of one time entry, read when `isEnabled` (the panel is open), newest first. */
export function useTimeLogHistory(entryId: string | null, isEnabled: boolean): HistoryState & { refetch: () => void } {
	const tenantId = getTenantIdCookie() ?? '';
	const organizationId = getOrganizationIdCookie() ?? '';
	const scope = { tenantId, organizationId, entryId: entryId ?? '' };
	const canRead = isEnabled && Boolean(entryId) && Boolean(organizationId);
	const query = useQuery({
		queryKey: queryKeys.timesheet.history.entry(scope),
		queryFn: () => readEntryHistory(scope.entryId),
		enabled: canRead,
		staleTime: HISTORY_STALE_MS,
		retry: false
	});
	const refetch = () => {
		void query.refetch();
	};
	if (query.isError) {
		const isForbidden = errorStatusOf(query.error) === FORBIDDEN;
		if (isForbidden) {
			return { status: 'forbidden', refetch };
		}
		return { status: 'error', refetch };
	}
	if (!query.data) {
		return { status: 'loading', refetch };
	}
	if (!query.data.isSupported) {
		return { status: 'unsupported', refetch };
	}
	return { status: 'ready', changes: query.data.changes, refetch };
}
