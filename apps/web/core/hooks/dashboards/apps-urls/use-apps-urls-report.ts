'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { activityService } from '@/core/services/client/api/activities/activity.service';
import { shouldRetryQuery } from '@/core/lib/helpers/retry-utils';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useLocalStorageState } from '@/core/hooks/common/use-local-storage-state';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { periodOfPreset, type Period } from '@/core/lib/utils/dashboard-period';
import {
	appsUrlsViewOf,
	flattenActivityReport,
	isCappedReport,
	titleTotalsOf,
	usageFiguresOf,
	usageGroupsOf,
	type AppsUrlsView
} from '@/core/lib/utils/dashboards/apps-urls';
import { ERoleName } from '@/core/types/generics/enums/role';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import type { IActivitiesReportRequest } from '@/core/types/interfaces/activity/activity-report';
import { isLiveDayRange, liveQueryOptionsOf } from '@/core/lib/utils/dashboard-live';

/** The key the page has always kept its grouping under, so a returning user opens on the view they left. */
const VIEW_STORAGE_KEY = 'group-by-type';

/** Monday weeks, as the dashboards' previous date picker. */
export const APPS_URLS_WEEK_START = 1;

/**
 * Only these roles see other members here: the activity report returns the caller's own data to anyone without
 * CHANGE_SELECTED_EMPLOYEE, so a team manager's filter would never change the rows.
 */
const ORGANIZATION_ROLES = new Set<string>([ERoleName.SUPER_ADMIN, ERoleName.ADMIN, ERoleName.MANAGER]);

const TRACKED_ONLY = [ETimeLogType.TRACKED];

const ALL_ACTIVITY_LEVELS = { start: 0, end: 100 };

const TEN_MINUTES = 1000 * 60 * 10;

const THIRTY_MINUTES = 1000 * 60 * 30;

function canSeeOtherMembersOf(roleName: string | null | undefined) {
	const normalizedRole = roleName?.toUpperCase() ?? '';
	return ORGANIZATION_ROLES.has(normalizedRole);
}

function requestedEmployeeIdsOf(canSeeOthers: boolean, selectedIds: string[], ownEmployeeId: string | undefined) {
	if (canSeeOthers) {
		return selectedIds;
	}
	if (ownEmployeeId) {
		return [ownEmployeeId];
	}
	return [];
}

function listOf(value: unknown): unknown[] {
	if (Array.isArray(value)) {
		return value;
	}
	return [];
}

function retryDelayOf(attemptIndex: number) {
	return Math.min(1000 * 2 ** attemptIndex, 30000);
}

async function fetchActivityReport(request: IActivitiesReportRequest | null) {
	if (!request) {
		throw new Error('The activity report needs an organization and a tenant');
	}
	return activityService.getActivitiesReport(request);
}

/**
 * State and data of the Apps & URLs page. The period, the member filter and the view are page state (never the
 * global member atoms), every id the request carries is in the query key, and Gauzy is asked for the date shape
 * only: it groups the same rows after its query whatever `groupBy` says, so every view is built here and switching
 * views costs no request.
 */
export function useAppsUrlsReport() {
	const { data: user } = useUserQuery();
	const [period, setPeriod] = useState<Period>(() => periodOfPreset('last7Days', APPS_URLS_WEEK_START));
	const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
	const [storedView, setStoredView] = useLocalStorageState<string>(VIEW_STORAGE_KEY, 'date');
	const view = appsUrlsViewOf(storedView);

	const tenantId = user?.tenantId ?? undefined;
	const organizationId = user?.employee?.organizationId ?? undefined;
	const ownEmployeeId = user?.employee?.id ?? undefined;
	const canFilterMembers = canSeeOtherMembersOf(user?.role?.name);
	const startDate = localDayKeyOf(period.from);
	const endDate = localDayKeyOf(period.to);

	const employeeIds = useMemo(
		() => requestedEmployeeIdsOf(canFilterMembers, selectedEmployeeIds, ownEmployeeId),
		[canFilterMembers, ownEmployeeId, selectedEmployeeIds]
	);

	const request = useMemo<IActivitiesReportRequest | null>(() => {
		const hasScope = Boolean(tenantId) && Boolean(organizationId);
		if (!hasScope) {
			return null;
		}
		return {
			organizationId: organizationId ?? '',
			tenantId: tenantId ?? '',
			startDate,
			endDate,
			groupBy: 'date',
			employeeIds,
			logType: TRACKED_ONLY,
			activityLevel: ALL_ACTIVITY_LEVELS
		};
	}, [employeeIds, endDate, organizationId, startDate, tenantId]);

	const isLive = isLiveDayRange(startDate, endDate);
	const query = useQuery({
		queryKey: queryKeys.activities.activityReport({
			tenantId,
			organizationId,
			startDate,
			endDate,
			groupBy: 'date',
			employeeIds,
			logType: TRACKED_ONLY,
			activityLevel: ALL_ACTIVITY_LEVELS
		}),
		queryFn: () => fetchActivityReport(request),
		enabled: request !== null,
		placeholderData: (previousData, previousQuery) => {
			const previousParams = previousQuery?.queryKey[2];
			const isSameTenant = previousParams?.tenantId === tenantId;
			const isSameOrganization = previousParams?.organizationId === organizationId;
			const isSameScope = isSameTenant && isSameOrganization;
			if (!isSameScope) {
				return undefined;
			}
			return previousData;
		},
		staleTime: TEN_MINUTES,
		gcTime: THIRTY_MINUTES,
		retry: shouldRetryQuery,
		retryDelay: retryDelayOf,
		...liveQueryOptionsOf(isLive)
	});

	const reportData = query.data?.data;
	const rows = useMemo(() => flattenActivityReport(listOf(reportData)), [reportData]);
	const titleTotals = useMemo(() => titleTotalsOf(rows), [rows]);
	const figures = useMemo(() => usageFiguresOf(rows, titleTotals), [rows, titleTotals]);
	const groups = useMemo(() => usageGroupsOf(rows, view), [rows, view]);

	const setView = useCallback((nextView: AppsUrlsView) => setStoredView(nextView), [setStoredView]);
	const clearMembers = useCallback(() => setSelectedEmployeeIds([]), []);
	const refetchQuery = query.refetch;
	const refetch = useCallback(() => {
		void refetchQuery();
	}, [refetchQuery]);

	const hasData = query.data !== undefined;
	const isLoading = !hasData && query.isPending;
	const isRefreshing = query.isPlaceholderData;
	const isUpdating = query.isFetching && hasData;
	const isError = query.isError;
	const isFiltered = selectedEmployeeIds.length > 0;

	return {
		period,
		setPeriod,
		view,
		setView,
		canFilterMembers,
		selectedEmployeeIds,
		setSelectedEmployeeIds,
		clearMembers,
		isFiltered,
		rows,
		titleTotals,
		figures,
		groups,
		isCapped: isCappedReport(rows.length),
		hasData,
		isLoading,
		isRefreshing,
		isUpdating,
		isError,
		refetch
	};
}

export type AppsUrlsReportState = ReturnType<typeof useAppsUrlsReport>;
