'use client';

import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { type Period, periodOfPreset } from '@/core/lib/utils/dashboard-period';
import {
	BUDGET_PROJECT_PARAM,
	BUDGET_WEEK_START,
	budgetFiguresOf,
	budgetFiltersOfLink,
	budgetGroupsOf,
	budgetLanesOf,
	budgetTotalsOf,
	EMPTY_BUDGET_FILTERS,
	filteredBudgetRowsOf,
	hasBudgetFilters,
	portfolioMetersOf,
	projectNamesByIdOf,
	unbudgetedRowsOf,
	type BudgetFilterField,
	type BudgetFilters,
	type BudgetScope
} from '@/core/lib/utils/dashboards/project-budget';
import { useProjectBudgetRows } from './use-project-budget-rows';

export type { ProjectBudgetShown } from '@/core/lib/utils/dashboards/project-budget';

function uniqueValuesOf<T extends string>(values: ReadonlyArray<T>): T[] {
	return [...new Set(values)];
}

export function useProjectBudgetReport({ unnamedLabel }: Readonly<{ unnamedLabel: string }>) {
	const searchParams = useSearchParams();
	const linkedProjectId = searchParams?.get(BUDGET_PROJECT_PARAM);

	const [scope, setScope] = useState<BudgetScope>('whole');
	const [period, setPeriod] = useState<Period>(() => periodOfPreset('thisMonth', BUDGET_WEEK_START));
	const [filters, setFilters] = useState<BudgetFilters>(() => budgetFiltersOfLink(linkedProjectId));

	const budgets = useProjectBudgetRows({ scope, period, unnamedLabel, followsLiveTime: true, isEnabled: true });
	const { shown, organizationProjects } = budgets;

	const allRows = shown?.rows;
	const visibleRows = useMemo(() => filteredBudgetRowsOf(allRows ?? [], filters), [allRows, filters]);
	const groups = useMemo(() => budgetGroupsOf(visibleRows), [visibleRows]);
	const totals = useMemo(() => budgetTotalsOf(visibleRows), [visibleRows]);
	const figures = useMemo(() => budgetFiguresOf(visibleRows, totals), [totals, visibleRows]);
	const lanes = useMemo(() => budgetLanesOf(groups), [groups]);
	const hasBoardRows = useMemo(() => lanes.some((lane) => lane.rows.length > 0), [lanes]);
	const unbudgetedRows = useMemo(() => unbudgetedRowsOf(groups), [groups]);
	const portfolio = useMemo(() => portfolioMetersOf(visibleRows, totals), [totals, visibleRows]);
	const projectNames = useMemo(() => projectNamesByIdOf(organizationProjects), [organizationProjects]);

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

	const isFiltered = hasBudgetFilters(filters);

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
		requestPeriod: budgets.requestPeriod,
		filters,
		setFilter,
		removeFilter,
		clearFilters,
		isFiltered,
		filterOptions,
		projectNames,
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
		isLoading: budgets.isLoading,
		isUpdating: budgets.isUpdating,
		showsError: budgets.showsError,
		showsProjectsError: budgets.showsProjectsError,
		refetch: budgets.refetch,
		refetchProjects: budgets.refetchProjects
	};
}

export type ProjectBudgetReportState = ReturnType<typeof useProjectBudgetReport>;
