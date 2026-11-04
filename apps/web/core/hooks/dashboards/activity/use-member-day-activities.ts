'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { endOfDay, startOfDay } from 'date-fns';
import { queryKeys } from '@/core/query/keys';
import { activityService } from '@/core/services/client/api/activities/activity.service';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { isLiveDayRange, liveQueryOptionsOf } from '@/core/lib/utils/dashboard-live';
import { activitiesOfEmployee, type AppActivity, appActivitiesOf } from '@/core/lib/utils/dashboards/app-activity';

const STALE_TIME = 1000 * 60 * 3;
const GC_TIME = 1000 * 60 * 15;
const NO_ACTIVITIES: AppActivity[] = [];

/**
 * One member's app and site entries of one day, each with its start and duration. Gauzy answers a caller who may not
 * pick other employees with their own entries, so only the asked member's are kept.
 */
export function useMemberDayActivities({
	employeeId,
	day,
	isEnabled
}: Readonly<{ employeeId: string | null; day: Date; isEnabled: boolean }>) {
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();
	const dayKey = localDayKeyOf(day);
	const hasScope = Boolean(tenantId) && Boolean(organizationId);
	const hasMember = Boolean(employeeId);
	const canRead = hasScope && hasMember;
	const isReady = canRead && isEnabled;
	const isLive = isLiveDayRange(dayKey, dayKey);
	const query = useQuery({
		queryKey: [...queryKeys.activities.all, 'member-day', tenantId, organizationId, employeeId, dayKey],
		queryFn: () =>
			activityService.getActivitiesInRange({
				employeeIds: [employeeId ?? ''],
				startDate: startOfDay(day),
				endDate: endOfDay(day)
			}),
		enabled: isReady,
		staleTime: STALE_TIME,
		gcTime: GC_TIME,
		...liveQueryOptionsOf(isLive)
	});
	const { data } = query;
	const activities = useMemo(() => {
		if (!data) {
			return NO_ACTIVITIES;
		}
		if (!employeeId) {
			return NO_ACTIVITIES;
		}
		const all = appActivitiesOf(data);
		return activitiesOfEmployee(all, employeeId);
	}, [data, employeeId]);
	return {
		activities,
		isLoading: query.isPending && isReady,
		isError: query.isError,
		refetch: query.refetch
	};
}
