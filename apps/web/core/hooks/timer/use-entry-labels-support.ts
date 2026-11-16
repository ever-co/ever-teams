'use client';

import { useQuery } from '@tanstack/react-query';

import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { queryKeys } from '@/core/query/keys';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';

/**
 * Whether entries can carry labels of their own: the API lists entries with their `tags` (Gauzy #12029). Asked once per
 * workspace. Until the answer comes, and against an API without them, every label control stays away and nothing is
 * sent that the API would refuse, so the app works as before.
 */
export function useEntryLabelsSupport(): boolean {
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();
	const hasWorkspace = Boolean(tenantId) && Boolean(organizationId);
	const { data } = useQuery({
		queryKey: queryKeys.timeLogs.entryLabelsSupport(tenantId, organizationId),
		queryFn: () => timeLogService.supportsEntryLabels(),
		enabled: hasWorkspace,
		staleTime: Infinity,
		gcTime: Infinity,
		retry: false
	});
	return data === true;
}
