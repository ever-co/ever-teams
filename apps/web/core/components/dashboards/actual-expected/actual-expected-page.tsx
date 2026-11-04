'use client';

import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { useLocale, useTranslations } from 'next-intl';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { Chart } from '@/core/components/icons';
import { DashboardBreadcrumb } from '@/core/components/dashboards/kit/dashboard-breadcrumb';
import { DashboardSection, DashboardToolbar } from '@/core/components/dashboards/kit/dashboard-layout';
import { BlockEmptyMessage, DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { ExportMenu } from '@/core/components/dashboards/kit/export-menu';
import { PeriodPicker } from '@/core/components/dashboards/kit/period-picker';
import { DASHBOARD_STACK } from '@/core/components/dashboards/kit/recipes';
import { useActualExpectedReport } from '@/core/hooks/dashboards/actual-expected/use-actual-expected-report';
import { formatPeriod, shiftPeriod } from '@/core/lib/utils/dashboard-period';
import { PLAN_WEEK_START, type VarianceDay } from '@/core/lib/utils/dashboards/actual-expected';
import { isTrackingEnabledState } from '@/core/stores';
import { useActualExpectedExportOptions } from './actual-expected-export';
import { ActualExpectedEmpty } from './actual-expected-table';
import { AppliedPlanMemberFilters, PlanGroupingControl, PlanMemberFilterMenu } from './actual-expected-toolbar';
import { PlanBulletRows } from './bullet-rows';
import { PlanOverview } from './plan-overview';

const PAGE_PATH = '/reports/actual-and-expected-hours';

const EMPTY_VARIANCE_DAYS: VarianceDay[] = [];

export function ActualExpectedPage() {
	const t = useTranslations();
	const locale = useLocale();
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const report = useActualExpectedReport({ unnamedLabel: t('timeActivity.UNNAMED_EMPLOYEE') });
	const { period, setPeriod, shown } = report;

	const title = t('dashboard.actualExpected.TITLE');
	const shownPeriod = shown?.period ?? period;
	const memberDayCount = shown?.memberDays.length ?? 0;
	const hasRows = memberDayCount > 0;
	const aheadPlannedDays = shown?.figures.aheadPlannedDays ?? 0;
	const hasPlansAhead = aheadPlannedDays > 0;
	const isFiltered = report.appliedEmployeeIds.length > 0;

	const exportOptions = useActualExpectedExportOptions({
		shown,
		groups: report.groups,
		grouping: report.grouping,
		reportTitle: title,
		teamName: report.teamName
	});

	const showPreviousPeriod = useCallback(() => {
		const previousPeriod = shiftPeriod(period, -1);
		setPeriod(previousPeriod);
	}, [period, setPeriod]);

	const periodText = formatPeriod(period, locale);
	const membersText = t('dashboard.weeklyLimit.MEMBERS_COUNT', { count: report.populationCount });
	const meta = `${periodText} · ${membersText}`;
	const isExportDisabled = !hasRows || report.isLoading;
	const showsReport = !report.showsError && !report.showsNoMembers;

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
					isMetaLoading={!report.isTeamReady}
					isUpdating={report.isUpdating}
					updatingLabel={t('dashboard.weeklyLimit.UPDATING')}
					actions={<ExportMenu options={exportOptions} isDisabled={isExportDisabled} />}
					controls={
						<>
							<PeriodPicker value={period} onChange={setPeriod} weekStartsOn={PLAN_WEEK_START} />
							<PlanMemberFilterMenu
								members={report.members}
								selectedIds={report.appliedEmployeeIds}
								onChange={report.setSelectedEmployeeIds}
								onClear={report.clearMembers}
							/>
						</>
					}
					trailingControls={
						<PlanGroupingControl grouping={report.grouping} onGroupingChange={report.setGrouping} />
					}
					belowControls={
						<AppliedPlanMemberFilters
							members={report.members}
							selectedIds={report.appliedEmployeeIds}
							onRemove={report.removeMember}
							onClear={report.clearMembers}
						/>
					}
				/>
			}
		>
			<div className={DASHBOARD_STACK}>
				{report.showsError && <DashboardErrorNotice onRetry={report.refetch} />}
				{report.showsNoMembers && (
					<DashboardSection>
						<BlockEmptyMessage
							title={t('dashboard.weeklyLimit.NO_MEMBERS_TITLE')}
							message={t('dashboard.actualExpected.NO_MEMBERS_MESSAGE')}
						/>
					</DashboardSection>
				)}
				{showsReport && (
					<>
						<PlanOverview
							figures={shown?.figures ?? null}
							varianceDays={shown?.varianceDays ?? EMPTY_VARIANCE_DAYS}
							isLoading={report.isLoading}
						/>
						<PlanBulletRows
							groups={report.activeGroups}
							idleMembers={report.idleMembers}
							idleDays={report.idleDays}
							grouping={report.grouping}
							totals={shown?.figures.totals ?? null}
							scale={report.bulletScale}
							hasRows={hasRows}
							isLoading={report.isLoading}
							isUpdating={report.isUpdating}
							empty={
								<ActualExpectedEmpty
									period={shownPeriod}
									isFiltered={isFiltered}
									hasPlansAhead={hasPlansAhead}
									onClearFilters={report.clearMembers}
									onPreviousPeriod={showPreviousPeriod}
								/>
							}
						/>
					</>
				)}
			</div>
		</PageLayout>
	);
}
