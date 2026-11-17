'use client';

import { useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { Notice } from '@/core/components/common/notice';
import { DashboardBreadcrumb } from '@/core/components/dashboards/kit/dashboard-breadcrumb';
import { Button } from '@/core/components/duplicated-components/_button';
import { DASHBOARD_STACK } from '@/core/components/dashboards/kit/recipes';
import { Chart } from '@/core/components/icons';
import {
	type TimeActivityReport,
	useTimeActivityReport
} from '@/core/hooks/dashboards/time-activity/use-time-activity-report';
import { breakdownFactsOf, labelGroupsOverlap } from '@/core/lib/utils/dashboards/time-activity';
import { shiftPeriod } from '@/core/lib/utils/dashboard-period';
import { isTrackingEnabledState } from '@/core/stores';
import { TimeActivityBreakdown, breakdownColumnsOf } from './time-activity-breakdown';
import { TimeActivityReportSheet } from './time-activity-report-sheet';
import { TimeActivitySavedReports } from './time-activity-saved-reports';
import { TimeActivityBandExport } from './time-activity-summary-band';
import { TimeActivityTimeSplit } from './time-activity-time-split';
import { TimeActivityToolbar } from './time-activity-toolbar';
import { TimeActivityWeekGrid } from './time-activity-week-grid';

function periodKeyOf(from: Date, to: Date) {
	return `${from.getTime()}:${to.getTime()}`;
}

/** Grouped by client, a clients list that could not load leaves archived clients unnamed: said quietly, with a retry. */
/** Under the Label grouping, an entry with several labels counts under each: the groups add up to more than the total. */
function LabelOverlapNotice() {
	const t = useTranslations();
	return (
		<Notice
			tone="info"
			title={t('timer.labels.OVERLAP_TITLE')}
			description={t('timer.labels.OVERLAP_MESSAGE')}
			className="mx-3 mt-3"
		/>
	);
}

function BreakdownNotice({ report }: Readonly<{ report: TimeActivityReport }>) {
	const isLabelGrouping = report.breakdownGrouping === 'label';
	const overlaps = useMemo(
		() => isLabelGrouping && labelGroupsOverlap(breakdownFactsOf(report.rows)),
		[isLabelGrouping, report.rows]
	);
	if (report.isClientNamesError) {
		return <ClientNamesNotice onRetry={report.retryClientNames} />;
	}
	if (overlaps) {
		return <LabelOverlapNotice />;
	}
	return null;
}

function ClientNamesNotice({ onRetry }: Readonly<{ onRetry: () => void }>) {
	const t = useTranslations();
	return (
		<Notice
			tone="warning"
			title={t('clientGrouping.NAMES_ERROR_TITLE')}
			description={t('clientGrouping.NAMES_ERROR_MESSAGE')}
			actions={
				<Button type="button" variant="outline" size="sm" onClick={onRetry}>
					{t('pages.unauthorized.TRY_AGAIN')}
				</Button>
			}
			className="mx-3 mt-3"
		/>
	);
}

export function TimeActivityPage() {
	const t = useTranslations();
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const report = useTimeActivityReport();
	const { settings, period, setPeriod, refetchDaily, refetchCounts } = report;
	const isWeekGrid = settings.grouping === 'week';
	const hasFilters = settings.activeFilterCount > 0;
	const title = t('timeActivity.TIME_AND_ACTIVITY');

	const columns = useMemo(
		() =>
			breakdownColumnsOf(
				report.breakdownGrouping,
				settings.hiddenColumns,
				report.isManager,
				report.billable.isOffered
			),
		[report.billable.isOffered, report.breakdownGrouping, report.isManager, settings.hiddenColumns]
	);

	const breadcrumbPaths = useMemo(
		() => [
			{ title: t('common.REPORTS'), href: '/' },
			{ title, href: '/reports/time-and-activity' }
		],
		[t, title]
	);

	const showPreviousPeriod = useCallback(() => setPeriod(shiftPeriod(period, -1)), [period, setPeriod]);
	const retryDaily = useCallback(() => void refetchDaily(), [refetchDaily]);
	const retryCounts = useCallback(() => void refetchCounts(), [refetchCounts]);

	return (
		<PageLayout
			title={title}
			showTimer={isTrackingEnabled}
			breadcrumb={<DashboardBreadcrumb icon={<Chart aria-hidden="true" />} paths={breadcrumbPaths} />}
			mainHeaderSlot={<TimeActivityToolbar report={report} />}
		>
			<div className={DASHBOARD_STACK}>
				<TimeActivityReportSheet
					figures={report.figures}
					chartDays={report.chartDays}
					isManager={report.isManager}
					isLoading={report.isFiguresLoading}
					isDailyPending={report.isDailyPending}
					isDailyError={report.isDailyError}
					isCountsError={report.isCountsError}
					onRetryDaily={retryDaily}
					onRetryCounts={retryCounts}
					exportSlot={
						<div className="flex flex-wrap items-center justify-end gap-2">
							<TimeActivitySavedReports report={report} />
							<TimeActivityBandExport report={report} />
						</div>
					}
					roundingRule={report.roundingRule}
					billable={report.billable}
				/>
				<TimeActivityTimeSplit report={report} />
				{isWeekGrid && (
					<TimeActivityWeekGrid
						key={periodKeyOf(period.from, period.to)}
						period={period}
						request={report.request}
						userId={report.user?.id}
						hasTaskFilter={report.hasTaskFilter}
						dailySource={report.weekDailySource}
					/>
				)}
				{!isWeekGrid && (
					<TimeActivityBreakdown
						key={report.breakdownGrouping}
						grouping={report.breakdownGrouping}
						rows={report.rows}
						billableFacts={report.billable.facts}
						isBillablePending={report.billable.isPending}
						isBillableError={report.billable.isError}
						columns={columns}
						period={period}
						isLoading={report.isBreakdownPending}
						isError={report.isBreakdownError}
						notice={<BreakdownNotice report={report} />}
						hasFilters={hasFilters}
						onRetry={retryDaily}
						onClearFilters={settings.clearFilters}
						onPreviousPeriod={showPreviousPeriod}
					/>
				)}
			</div>
		</PageLayout>
	);
}
