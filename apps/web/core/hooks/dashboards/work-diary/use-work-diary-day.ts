'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { endOfDay, startOfDay } from 'date-fns';
import { queryKeys } from '@/core/query/keys';
import { statisticsService } from '@/core/services/client/api/timesheets/statistic.service';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { isLiveDayRange, liveQueryOptionsOf } from '@/core/lib/utils/dashboard-live';
import { diaryDayOf } from '@/core/lib/utils/dashboards/work-diary';
import type { TTimeSlotsData } from '@/core/types/schemas/timer/time-slot.schema';
import { useMemberDayActivities } from '@/core/hooks/dashboards/activity/use-member-day-activities';

const STALE_TIME = 1000 * 60 * 3;
const GC_TIME = 1000 * 60 * 15;
const NO_SLOTS: TTimeSlotsData[] = [];

/** Gauzy returns another member's slots only to a manager of the team sent with the request. */
function teamIdsOf(isOwn: boolean, teamId: string | null) {
	if (isOwn) {
		return [];
	}
	if (!teamId) {
		return [];
	}
	return [teamId];
}

/**
 * One member's day in the work diary: the ten-minute slots with their screenshots and activity, and the app and site
 * entries recorded in them. Under the time-slot key family, so deleting a slot elsewhere refreshes it.
 */
export function useWorkDiaryDay({
	employeeId,
	isOwn,
	teamId,
	day
}: Readonly<{ employeeId: string | null; isOwn: boolean; teamId: string | null; day: Date }>) {
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();
	const dayKey = localDayKeyOf(day);
	const teamIds = useMemo(() => teamIdsOf(isOwn, teamId), [isOwn, teamId]);
	const hasScope = Boolean(tenantId) && Boolean(organizationId);
	const hasMember = Boolean(employeeId);
	const isReady = hasScope && hasMember;
	const isLive = isLiveDayRange(dayKey, dayKey);
	const slotsQuery = useQuery({
		queryKey: [
			...queryKeys.timer.timeSlots.all,
			'work-diary',
			tenantId,
			organizationId,
			employeeId,
			dayKey,
			teamIds
		],
		queryFn: async () => {
			const entries = await statisticsService.getTimeSlotsStatistics({
				employeeId: employeeId ?? '',
				teamIds,
				todayStart: startOfDay(day),
				todayEnd: endOfDay(day)
			});
			const memberEntry = entries.find((entry) => entry.id === employeeId);
			return memberEntry?.timeSlots ?? NO_SLOTS;
		},
		enabled: isReady,
		staleTime: STALE_TIME,
		gcTime: GC_TIME,
		...liveQueryOptionsOf(isLive)
	});
	const slots = slotsQuery.data ?? NO_SLOTS;
	const diary = useMemo(() => diaryDayOf(slots, day), [day, slots]);
	const apps = useMemberDayActivities({ employeeId, day, isEnabled: true });
	return {
		diary,
		activities: apps.activities,
		isAppsLoading: apps.isLoading,
		isLoading: slotsQuery.isPending && isReady,
		isError: slotsQuery.isError,
		refetch: slotsQuery.refetch
	};
}
