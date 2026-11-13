'use client';

import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { queryKeys } from '@/core/query/keys';
import { timeLogReportService } from '@/core/services/client/api/timesheets/time-log-report.service';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { getDefaultTimezone } from '@/core/lib/helpers/date-and-time';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { isLiveDayRange, liveQueryOptionsOf } from '@/core/lib/utils/dashboard-live';
import type { Period } from '@/core/lib/utils/dashboard-period';
import {
	budgetRowsOf,
	wholeProjectPeriodOf,
	type BudgetScope,
	type ProjectBudgetShown
} from '@/core/lib/utils/dashboards/project-budget';
import type { TProjectBudgetReport } from '@/core/types/schemas/timer/time-log-reports.schema';

interface ProjectBudgetRequest {
	scope: BudgetScope;
	period: Period;
	timeZone: string;
	/** Tenant and organisation: the previous budgets stay on screen only while these do not change. */
	scopeKey: string;
}

interface ProjectBudgetResult {
	request: ProjectBudgetRequest;
	reports: TProjectBudgetReport[];
}

interface ProjectBudgetRowsOptions {
	scope: BudgetScope;
	/** The period picked in the `period` scope; the `whole` scope does not read it. */
	period: Period | null;
	unnamedLabel: string;
	/**
	 * The report follows the time being tracked, one read a minute while it shows today. A page that only quotes its
	 * figures reads them when it opens: Gauzy goes through every time log of the range to answer.
	 */
	followsLiveTime: boolean;
	isEnabled: boolean;
}

async function fetchProjectBudgets(request: ProjectBudgetRequest): Promise<ProjectBudgetResult> {
	const reports = await timeLogReportService.getProjectBudgetReport({
		from: request.period.from,
		to: request.period.to,
		timeZone: request.timeZone
	});
	return { request, reports };
}

function scopeKeyOf(tenantId: string | null | undefined, organizationId: string | null | undefined) {
	const tenantPart = tenantId ?? '';
	const organizationPart = organizationId ?? '';
	return `${tenantPart}:${organizationPart}`;
}

function previousOfSameScope(previous: ProjectBudgetResult | undefined, scopeKey: string) {
	const isSameScope = previous?.request.scopeKey === scopeKey;
	if (!isSameScope) {
		return undefined;
	}
	return previous;
}

function requestPeriodOf(scope: BudgetScope, wholePeriod: Period, pickedPeriod: Period | null) {
	if (scope === 'whole') {
		return wholePeriod;
	}
	return pickedPeriod ?? wholePeriod;
}

/**
 * One row per project from Gauzy's budget report, under one cache key for every reader of a same range: the Project
 * Budget report, the projects list and a project's page show the same figures because they read the same answer.
 * Everything shown derives from the data's own request, so whole-project budgets kept on screen keep their label.
 */
export function useProjectBudgetRows({
	scope,
	period,
	unnamedLabel,
	followsLiveTime,
	isEnabled
}: Readonly<ProjectBudgetRowsOptions>) {
	const organization = useAtomValue(currentOrganizationState);
	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();
	const timeZone = useMemo(() => getDefaultTimezone(), []);

	const todayKey = localDayKeyOf(new Date());
	const wholePeriod = useMemo(() => wholeProjectPeriodOf(todayKey), [todayKey]);
	const requestPeriod = requestPeriodOf(scope, wholePeriod, period);

	const request = useMemo<ProjectBudgetRequest>(
		() => ({
			scope,
			period: requestPeriod,
			timeZone,
			scopeKey: scopeKeyOf(tenantId, organizationId)
		}),
		[organizationId, requestPeriod, scope, tenantId, timeZone]
	);

	const hasScope = Boolean(organizationId) && Boolean(tenantId);
	const isQueryEnabled = hasScope && isEnabled;
	const fromKey = localDayKeyOf(requestPeriod.from);
	const toKey = localDayKeyOf(requestPeriod.to);
	const showsToday = isLiveDayRange(fromKey, toKey);
	const isLive = followsLiveTime && showsToday;

	const query = useQuery({
		queryKey: queryKeys.timesheet.reports.projectBudgets({
			tenantId,
			organizationId,
			scope,
			from: requestPeriod.from.toISOString(),
			to: requestPeriod.to.toISOString(),
			timeZone
		}),
		queryFn: () => fetchProjectBudgets(request),
		enabled: isQueryEnabled,
		placeholderData: (previous) => previousOfSameScope(previous, request.scopeKey),
		...liveQueryOptionsOf(isLive)
	});

	const {
		organizationProjects,
		getOrganizationProjectsLoading,
		isOrganizationProjectsError,
		refetchOrganizationProjects
	} = useOrganizationProjectsQuery({ enabled: isEnabled });

	const result = query.data;
	const organizationCurrency = organization?.currency;

	const shown = useMemo<ProjectBudgetShown | null>(() => {
		if (!result) {
			return null;
		}
		const rows = budgetRowsOf({
			reports: result.reports,
			projects: organizationProjects,
			organizationCurrency,
			unnamedLabel
		});
		return { scope: result.request.scope, period: result.request.period, rows };
	}, [organizationCurrency, organizationProjects, result, unnamedLabel]);

	const isOrganizationReady = organization !== null;
	const hasData = result !== undefined;
	const isWaitingForData = isQueryEnabled && !hasData && !query.isError;
	const isWaitingForProjects = Boolean(getOrganizationProjectsLoading);
	const isLoading = !isOrganizationReady || isWaitingForData || isWaitingForProjects;
	const isUpdating = query.isFetching && hasData;
	const showsError = query.isError && !hasData;

	const refetchQuery = query.refetch;
	const refetch = useCallback(() => {
		void refetchQuery();
	}, [refetchQuery]);

	const refetchProjects = useCallback(() => {
		void refetchOrganizationProjects();
	}, [refetchOrganizationProjects]);

	return {
		requestPeriod,
		shown,
		organizationProjects,
		isLoading,
		isUpdating,
		showsError,
		showsProjectsError: isOrganizationProjectsError,
		refetch,
		refetchProjects
	};
}
