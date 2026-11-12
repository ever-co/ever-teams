'use client';

import { useCallback, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { useGetCurrentOrganization } from '@/core/hooks/auth/use-current-organization';
import { useProjectBudgetRows } from '@/core/hooks/dashboards/project-budget/use-project-budget-rows';
import type { BudgetRow } from '@/core/lib/utils/dashboards/project-budget';
import { budgetRowsByProjectOf, CONSUMPTION_SCOPE } from '@/core/lib/utils/project-consumption';
import { canManageActiveTeamState } from '@/core/stores';

export interface ProjectConsumptionState {
	/** False for someone who cannot open the Project Budget report: nothing is asked for and nothing is shown. */
	isAvailable: boolean;
	isLoading: boolean;
	hasFailed: boolean;
	rowOf: (projectId: string) => BudgetRow | undefined;
	retry: () => void;
}

const NO_ROWS: ReadonlyArray<BudgetRow> = [];

/**
 * The Project Budget report is open to team managers and organization admins only (`MustBeAManager` on the reports
 * layout). Its figures shown on projects go to the same people.
 */
export function useCanSeeProjectConsumption() {
	return useAtomValue(canManageActiveTeamState);
}

/**
 * Each project's time spent and budget use over its whole life, as the Project Budget report states them: the
 * report's own request, read once for every project and kept in the report's cache. The organisation is loaded here
 * because its currency is the last fallback of a cost budget, as on the report.
 */
export function useProjectConsumption({ isEnabled }: Readonly<{ isEnabled: boolean }>): ProjectConsumptionState {
	const t = useTranslations();
	const organizationRead = useGetCurrentOrganization({ enabled: isEnabled });
	const budgets = useProjectBudgetRows({
		scope: CONSUMPTION_SCOPE,
		period: null,
		unnamedLabel: t('dashboard.projectBudget.UNNAMED_PROJECT'),
		followsLiveTime: false,
		isEnabled
	});

	const rows = budgets.shown?.rows ?? NO_ROWS;
	const rowsByProject = useMemo(() => budgetRowsByProjectOf(rows), [rows]);
	const rowOf = useCallback((projectId: string) => rowsByProject.get(projectId), [rowsByProject]);

	const hasReadFailed = budgets.showsError || organizationRead.isError;
	const hasFailed = isEnabled && hasReadFailed;
	const isWaiting = budgets.isLoading && !hasReadFailed;
	const isLoading = isEnabled && isWaiting;

	const refetchBudgets = budgets.refetch;
	const refetchOrganization = organizationRead.refetch;
	const retry = useCallback(() => {
		refetchBudgets();
		void refetchOrganization();
	}, [refetchBudgets, refetchOrganization]);

	return useMemo(
		() => ({ isAvailable: isEnabled, isLoading, hasFailed, rowOf, retry }),
		[hasFailed, isEnabled, isLoading, retry, rowOf]
	);
}
