'use client';

import { useCallback, useMemo, useState } from 'react';
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
import { type Period, periodOfPreset } from '@/core/lib/utils/dashboard-period';
import {
	BUDGET_WEEK_START,
	budgetFiguresOf,
	budgetGroupsOf,
	budgetLanesOf,
	budgetRowsOf,
	budgetTotalsOf,
	EMPTY_BUDGET_FILTERS,
	filteredBudgetRowsOf,
	hasBudgetFilters,
	portfolioMetersOf,
	unbudgetedRowsOf,
	wholeProjectPeriodOf,
	type BudgetFilterField,
	type BudgetFilters,
	type BudgetRow,
	type BudgetScope
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

export interface ProjectBudgetShown {
	scope: BudgetScope;
	period: Period;
	rows: BudgetRow[];
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

function requestPeriodOf(scope: BudgetScope, wholePeriod: Period, pickedPeriod: Period) {
	if (scope === 'whole') {
		return wholePeriod;
	}
	return pickedPeriod;
}

function uniqueValuesOf<T extends string>(values: ReadonlyArray<T>): T[] {
	return [...new Set(values)];
}

/** Everything shown derives from the data's own request, so whole-project budgets kept on screen keep their label. */
export function useProjectBudgetReport({ unnamedLabel }: Readonly<{ unnamedLabel: string }>) {
	const organization = useAtomValue(currentOrganizationState);
	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();
	const timeZone = useMemo(() => getDefaultTimezone(), []);

	const [scope, setScope] = useState<BudgetScope>('whole');
	const [period, setPeriod] = useState<Period>(() => periodOfPreset('thisMonth', BUDGET_WEEK_START));
	const [filters, setFilters] = useState<BudgetFilters>(EMPTY_BUDGET_FILTERS);

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
	const fromKey = localDayKeyOf(requestPeriod.from);
	const toKey = localDayKeyOf(requestPeriod.to);
	const isLive = isLiveDayRange(fromKey, toKey);

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
		enabled: hasScope,
		placeholderData: (previous) => previousOfSameScope(previous, request.scopeKey),
		...liveQueryOptionsOf(isLive)
	});

	const {
		organizationProjects,
		getOrganizationProjectsLoading,
		isOrganizationProjectsError,
		refetchOrganizationProjects
	} = useOrganizationProjectsQuery();

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

	const allRows = shown?.rows;
	const visibleRows = useMemo(() => filteredBudgetRowsOf(allRows ?? [], filters), [allRows, filters]);
	const groups = useMemo(() => budgetGroupsOf(visibleRows), [visibleRows]);
	const totals = useMemo(() => budgetTotalsOf(visibleRows), [visibleRows]);
	const figures = useMemo(() => budgetFiguresOf(visibleRows, totals), [totals, visibleRows]);
	const lanes = useMemo(() => budgetLanesOf(groups), [groups]);
	const hasBoardRows = useMemo(() => lanes.some((lane) => lane.rows.length > 0), [lanes]);
	const unbudgetedRows = useMemo(() => unbudgetedRowsOf(groups), [groups]);
	const portfolio = useMemo(() => portfolioMetersOf(visibleRows, totals), [totals, visibleRows]);

	const filterOptions = useMemo(() => {
		const rows = allRows ?? [];
		return {
			projects: rows.map((row) => row.project),
			budgetTypes: uniqueValuesOf(rows.map((row) => row.budgetType)),
			risks: uniqueValuesOf(rows.map((row) => row.risk))
		};
	}, [allRows]);

	const hasBudgetedProject = useMemo(() => {
		const rows = allRows ?? [];
		return rows.some((row) => row.hasBudget);
	}, [allRows]);

	const isOrganizationReady = organization !== null;
	const hasData = result !== undefined;
	const isWaitingForData = hasScope && !hasData && !query.isError;
	const isWaitingForProjects = Boolean(getOrganizationProjectsLoading);
	const isLoading = !isOrganizationReady || isWaitingForData || isWaitingForProjects;
	const isUpdating = query.isFetching && hasData;
	const showsError = query.isError && !hasData;
	const isFiltered = hasBudgetFilters(filters);

	const refetchQuery = query.refetch;
	const refetch = useCallback(() => {
		void refetchQuery();
	}, [refetchQuery]);

	const refetchProjects = useCallback(() => {
		void refetchOrganizationProjects();
	}, [refetchOrganizationProjects]);

	const setFilter = useCallback((field: BudgetFilterField, values: string[]) => {
		setFilters((current) => ({ ...current, [field]: values }));
	}, []);

	const removeFilter = useCallback((field: BudgetFilterField, value: string) => {
		setFilters((current) => {
			const remaining = current[field].filter((picked) => picked !== value);
			return { ...current, [field]: remaining };
		});
	}, []);

	const clearFilters = useCallback(() => setFilters(EMPTY_BUDGET_FILTERS), []);

	return {
		scope,
		setScope,
		period,
		setPeriod,
		requestPeriod,
		filters,
		setFilter,
		removeFilter,
		clearFilters,
		isFiltered,
		filterOptions,
		shown,
		visibleRows,
		groups,
		totals,
		figures,
		lanes,
		hasBoardRows,
		unbudgetedRows,
		portfolio,
		hasBudgetedProject,
		isLoading,
		isUpdating,
		showsError,
		showsProjectsError: isOrganizationProjectsError,
		refetch,
		refetchProjects
	};
}

export type ProjectBudgetReportState = ReturnType<typeof useProjectBudgetReport>;
