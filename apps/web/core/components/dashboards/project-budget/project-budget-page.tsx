'use client';

import { useAtomValue } from 'jotai';
import { useLocale, useTranslations } from 'next-intl';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { Chart } from '@/core/components/icons';
import { DashboardBreadcrumb } from '@/core/components/dashboards/kit/dashboard-breadcrumb';
import { DashboardToolbar } from '@/core/components/dashboards/kit/dashboard-layout';
import { DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { ExportMenu } from '@/core/components/dashboards/kit/export-menu';
import { PeriodPicker } from '@/core/components/dashboards/kit/period-picker';
import { DASHBOARD_STACK } from '@/core/components/dashboards/kit/recipes';
import { useProjectBudgetReport } from '@/core/hooks/dashboards/project-budget/use-project-budget-report';
import { formatPeriod, type Period } from '@/core/lib/utils/dashboard-period';
import { BUDGET_WEEK_START, type BudgetScope } from '@/core/lib/utils/dashboards/project-budget';
import { isTrackingEnabledState } from '@/core/stores';
import { ProjectBudgetBoard } from './budget-board';
import { ProjectBudgetPortfolio } from './budget-portfolio';
import { ProjectBudgetUnbudgeted } from './budget-unbudgeted';
import { useProjectBudgetExportOptions } from './project-budget-export';
import { BudgetScopeControl, useBudgetFilterControls } from './project-budget-toolbar';

const PAGE_PATH = '/reports/project-budget';

function metaOf(scope: BudgetScope, period: Period, projectsText: string, locale: string) {
	if (scope === 'whole') {
		return projectsText;
	}
	const periodText = formatPeriod(period, locale);
	return `${periodText} · ${projectsText}`;
}

export function ProjectBudgetPage() {
	const t = useTranslations();
	const locale = useLocale();
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const report = useProjectBudgetReport({ unnamedLabel: t('dashboard.projectBudget.UNNAMED_PROJECT') });
	const { scope, period, setPeriod, figures, groups, totals, shown } = report;

	const shownScope = shown?.scope ?? scope;
	const shownPeriod = shown?.period ?? report.requestPeriod;
	const isPeriodScope = scope === 'period';
	const hasRows = report.visibleRows.length > 0;
	const isExportDisabled = !hasRows || report.isLoading;
	const showsReport = !report.showsError;

	const { menu: filterMenu, chips: filterChips } = useBudgetFilterControls({
		filters: report.filters,
		options: report.filterOptions,
		projectNames: report.projectNames,
		scope: shownScope,
		onChange: report.setFilter,
		onRemove: report.removeFilter,
		onClear: report.clearFilters
	});

	const exportOptions = useProjectBudgetExportOptions({
		scope: shownScope,
		period: shownPeriod,
		groups,
		totals,
		figures
	});

	const title = t('dashboard.projectBudget.TITLE');
	const projectsText = t('dashboard.projectBudget.META_PROJECTS', { count: figures.budgetedCount });
	const meta = metaOf(scope, report.requestPeriod, projectsText, locale);
	const breadcrumbPaths = [
		{ title: t('common.REPORTS'), href: '/' },
		{ title, href: PAGE_PATH }
	];

	return (
		<PageLayout
			title={title}
			showTimer={isTrackingEnabled}
			breadcrumb={<DashboardBreadcrumb icon={<Chart aria-hidden="true" />} paths={breadcrumbPaths} />}
			mainHeaderSlot={
				<DashboardToolbar
					title={title}
					meta={meta}
					isMetaLoading={report.isLoading}
					isUpdating={report.isUpdating}
					updatingLabel={t('dashboard.projectBudget.UPDATING')}
					actions={<ExportMenu options={exportOptions} isDisabled={isExportDisabled} />}
					controls={
						<>
							<BudgetScopeControl scope={scope} onScopeChange={report.setScope} />
							{isPeriodScope && (
								<PeriodPicker value={period} onChange={setPeriod} weekStartsOn={BUDGET_WEEK_START} />
							)}
							{filterMenu}
						</>
					}
					belowControls={filterChips}
				/>
			}
		>
			<div className={DASHBOARD_STACK}>
				{report.showsError && <DashboardErrorNotice onRetry={report.refetch} />}
				{showsReport && (
					<>
						<ProjectBudgetPortfolio
							meters={report.portfolio}
							figures={figures}
							scope={shownScope}
							isLoading={report.isLoading}
						/>
						{report.showsProjectsError && (
							<DashboardErrorNotice
								title={t('dashboard.projectBudget.PROJECTS_ERROR')}
								onRetry={report.refetchProjects}
							/>
						)}
						<ProjectBudgetBoard
							lanes={report.lanes}
							scope={shownScope}
							visibleCount={report.visibleRows.length}
							hasBudgetedProject={report.hasBudgetedProject}
							isFiltered={report.isFiltered}
							isLoading={report.isLoading}
							isUpdating={report.isUpdating}
							onClearFilters={report.clearFilters}
						/>
						<ProjectBudgetUnbudgeted rows={report.unbudgetedRows} isOpenByDefault={!report.hasBoardRows} />
					</>
				)}
			</div>
		</PageLayout>
	);
}
