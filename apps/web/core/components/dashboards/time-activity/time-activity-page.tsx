'use client';

import { useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { DashboardBreadcrumb } from '@/core/components/dashboards/kit/dashboard-breadcrumb';
import { DASHBOARD_STACK } from '@/core/components/dashboards/kit/recipes';
import { Chart } from '@/core/components/icons';
import { useTimeActivityReport } from '@/core/hooks/dashboards/time-activity/use-time-activity-report';
import { shiftPeriod } from '@/core/lib/utils/dashboard-period';
import { isTrackingEnabledState } from '@/core/stores';
import { TimeActivityBreakdown, breakdownColumnsOf } from './time-activity-breakdown';
import { TimeActivityReportSheet } from './time-activity-report-sheet';
import { TimeActivityBandExport } from './time-activity-summary-band';
import { TimeActivityToolbar } from './time-activity-toolbar';
import { TimeActivityWeekGrid } from './time-activity-week-grid';

function periodKeyOf(from: Date, to: Date) {
	return `${from.getTime()}:${to.getTime()}`;
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
		() => breakdownColumnsOf(report.breakdownGrouping, settings.hiddenColumns, report.isManager),
		[report.breakdownGrouping, report.isManager, settings.hiddenColumns]
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
					exportSlot={<TimeActivityBandExport report={report} />}
				/>
				{isWeekGrid && (
					<TimeActivityWeekGrid
						key={periodKeyOf(period.from, period.to)}
						period={period}
						request={report.request}
						userId={report.user?.id}
						hasTaskFilter={report.hasTaskFilter}
					/>
				)}
				{!isWeekGrid && (
					<TimeActivityBreakdown
						key={report.breakdownGrouping}
						grouping={report.breakdownGrouping}
						rows={report.rows}
						columns={columns}
						period={period}
						isLoading={report.isDailyPending}
						isError={report.isDailyError}
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
