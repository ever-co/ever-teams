'use client';

import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useEntryLabelsSupportState } from '@/core/hooks/timer/use-entry-labels-support';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { queryKeys } from '@/core/query/keys';
import { savedReportService } from '@/core/services/client/api/timesheets/saved-report.service';
import { shellSettledState } from '@/core/stores/common/shell';

/**
 * What is known of saved reports and the labels of entries: `kept` (Gauzy keeps them), `not-kept` (an older Gauzy, or
 * entries without labels), `checking` (not answered yet) or `failed` (Gauzy could not be asked after its retries, or
 * whether entries have labels could not be read).
 */
export type SavedReportLabelsSupport = 'kept' | 'not-kept' | 'checking' | 'failed';

interface SavedReportLabelsSupportState {
	/** A saved report keeps the labels of entries: only once `support` is `kept`. */
	keepsEntryLabels: boolean;
	support: SavedReportLabelsSupport;
	/** Asks Gauzy again, after a failure. */
	retry: () => void;
}

function supportOf(
	entryLabels: { isSupported: boolean; isKnown: boolean; hasFailed: boolean },
	hasWorkspace: boolean,
	answer: { data: boolean | undefined; isError: boolean }
): SavedReportLabelsSupport {
	if (!hasWorkspace) {
		return 'not-kept';
	}
	// A check of entry labels given up on is no answer: `failed`, with its own retry, never `not-kept`
	if (!entryLabels.isSupported) {
		if (entryLabels.hasFailed) {
			return 'failed';
		}
		return entryLabels.isKnown ? 'not-kept' : 'checking';
	}
	if (answer.data !== undefined) {
		return answer.data ? 'kept' : 'not-kept';
	}
	return answer.isError ? 'failed' : 'checking';
}

/**
 * Whether a saved report keeps the labels of entries: the entry Labels filter and the Label grouping. Only a Gauzy with
 * ever-gauzy#12073 does (Ever Teams production may talk to an older one), and only where entries have labels at all
 * (`useEntryLabelsSupportState`). Until both are known, and against an older Gauzy, `keepsEntryLabels` is false, and a
 * view narrowed or grouped by labels is neither saved nor written over a report (`canSaveView`), as before; `support`
 * tells the page which of these it is, so it says "checking" rather than "not kept" while Gauzy has not answered.
 *
 * Gauzy is asked once per workspace, and only once a view or a saved report uses labels (`isNeeded`): any other view
 * saves the body an older Gauzy takes, and needs no answer. A failure to ask is tried again, then reads as `failed`.
 *
 * @param isNeeded The view shown, or the report it was opened from, uses labels of entries.
 */
export function useSavedReportLabelsSupport(isNeeded: boolean): SavedReportLabelsSupportState {
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();
	const hasWorkspace = Boolean(tenantId) && Boolean(organizationId);
	const shellSettled = useAtomValue(shellSettledState);
	const entryLabels = useEntryLabelsSupportState();
	const { data, isError, refetch } = useQuery({
		queryKey: queryKeys.savedReports.entryLabelsSupport(tenantId, organizationId),
		queryFn: () => savedReportService.keepsEntryLabels(),
		enabled: isNeeded && entryLabels.isSupported && hasWorkspace && shellSettled,
		staleTime: Infinity,
		gcTime: Infinity,
		retry: 3
	});
	const { hasFailed: hasEntryLabelsCheckFailed, retry: retryEntryLabelsCheck } = entryLabels;
	// The check of entry labels first: only once entries are known to have labels is Gauzy asked about saved reports
	const retry = useCallback(() => {
		if (hasEntryLabelsCheckFailed) {
			retryEntryLabelsCheck();
			return;
		}
		void refetch();
	}, [hasEntryLabelsCheckFailed, refetch, retryEntryLabelsCheck]);
	const support = supportOf(entryLabels, hasWorkspace, { data, isError });
	return { keepsEntryLabels: support === 'kept', support, retry };
}
