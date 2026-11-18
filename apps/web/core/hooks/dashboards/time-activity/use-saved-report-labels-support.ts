'use client';

import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useEntryLabelsSupport } from '@/core/hooks/timer/use-entry-labels-support';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { queryKeys } from '@/core/query/keys';
import { savedReportService } from '@/core/services/client/api/timesheets/saved-report.service';
import { shellSettledState } from '@/core/stores/common/shell';

/**
 * Whether a saved report keeps the labels of entries: the entry Labels filter and the Label grouping. Only a Gauzy with
 * ever-gauzy#12073 does (Ever Teams production may talk to an older one), and only where entries have labels at all
 * (`useEntryLabelsSupport`): until both are known, and against an older Gauzy, it is false, and a view narrowed or
 * grouped by labels is neither saved nor written over a report (`canSaveView`), as before.
 *
 * Gauzy is asked once per workspace, and only once a view or a saved report uses labels (`isNeeded`): any other view
 * saves the body an older Gauzy takes, and needs no answer. A failure to ask is tried again, and reads as false.
 *
 * @param isNeeded The view shown, or the report it was opened from, uses labels of entries.
 */
export function useSavedReportLabelsSupport(isNeeded: boolean): boolean {
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();
	const hasWorkspace = Boolean(tenantId) && Boolean(organizationId);
	const shellSettled = useAtomValue(shellSettledState);
	const hasEntryLabels = useEntryLabelsSupport();
	const { data } = useQuery({
		queryKey: queryKeys.savedReports.entryLabelsSupport(tenantId, organizationId),
		queryFn: () => savedReportService.keepsEntryLabels(),
		enabled: isNeeded && hasEntryLabels && hasWorkspace && shellSettled,
		staleTime: Infinity,
		gcTime: Infinity,
		retry: 3
	});
	return hasEntryLabels && data === true;
}
