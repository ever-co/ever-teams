'use client';

import { type ReactNode, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import type { DayBarDatum } from '@/core/components/dashboards/kit/day-bars-chart';
import { DASHBOARD_SURFACE, SECTION_TITLE } from '@/core/components/dashboards/kit/recipes';
import type { TimeActivityFigures } from '@/core/hooks/dashboards/time-activity/use-time-activity-report';
import { hasActivityIn } from '@/core/lib/utils/dashboards/time-activity';
import { type AreaChartLabels, TimeActivityAreaChart, TimeActivityAreaChartSkeleton } from './time-activity-area-chart';
import { TimeActivitySummaryBand, TimeActivitySummaryBandSkeleton } from './time-activity-summary-band';

function hasTrackedTime(day: DayBarDatum) {
	return day.value > 0;
}

/** A period with time but no activity says why the activity line is missing; an empty period says nothing more. */
function ChartLegend({ days }: Readonly<{ days: ReadonlyArray<DayBarDatum> }>) {
	const t = useTranslations();
	const showsActivity = hasActivityIn(days);
	const hasTime = days.some(hasTrackedTime);
	const explainsMissingLine = hasTime && !showsActivity;
	return (
		<span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
			<span className="inline-flex items-center gap-1.5">
				<span
					aria-hidden="true"
					className="h-2 w-3 rounded-[2px] bg-primary/25 hairline-ring ring-primary/60"
				/>
				{t('dashboard.timeActivity.chart.TRACKED')}
			</span>
			{showsActivity && (
				<span className="inline-flex items-center gap-1.5">
					<span aria-hidden="true" className="h-0.5 w-3 rounded-full bg-info" />
					{t('dashboard.timeActivity.columns.ACTIVITY')}
				</span>
			)}
			{explainsMissingLine && <span>{t('dashboard.timeActivity.sheet.NO_ACTIVITY')}</span>}
		</span>
	);
}

function ChartHeader({ legend }: Readonly<{ legend?: ReactNode }>) {
	const t = useTranslations();
	return (
		<div className="flex min-h-9 flex-wrap items-center justify-between gap-x-3 gap-y-1">
			<h2 className={SECTION_TITLE}>{t('dashboard.timeActivity.chart.TITLE')}</h2>
			{legend}
		</div>
	);
}

function useChartLabels(): AreaChartLabels {
	const t = useTranslations();
	return useMemo(
		() => ({
			ariaLabel: t('dashboard.timeActivity.sheet.CHART_LABEL'),
			tracked: t('dashboard.timeActivity.chart.TRACKED'),
			activity: t('dashboard.timeActivity.columns.ACTIVITY'),
			empty: t('dashboard.timeActivity.chart.EMPTY')
		}),
		[t]
	);
}

const CHART_PART = 'px-4 pt-1 pb-4';

/** Drawn by the route skeleton and by the page on its first load: one picture from the route to the data. */
export function TimeActivityReportSheetSkeleton({ isManager = true }: Readonly<{ isManager?: boolean }>) {
	const t = useTranslations();
	return (
		<section aria-label={t('dashboard.timeActivity.sheet.LABEL')} className={DASHBOARD_SURFACE}>
			<TimeActivitySummaryBandSkeleton isManager={isManager} />
			<div className={CHART_PART}>
				<ChartHeader />
				<TimeActivityAreaChartSkeleton />
			</div>
		</section>
	);
}

export function TimeActivityReportSheet({
	figures,
	chartDays,
	isManager,
	isLoading,
	isDailyPending,
	isDailyError,
	isCountsError,
	onRetryDaily,
	onRetryCounts,
	exportSlot
}: Readonly<{
	figures: TimeActivityFigures;
	chartDays: DayBarDatum[];
	isManager: boolean;
	isLoading: boolean;
	isDailyPending: boolean;
	isDailyError: boolean;
	isCountsError: boolean;
	onRetryDaily: () => void;
	onRetryCounts: () => void;
	exportSlot: ReactNode;
}>) {
	const t = useTranslations();
	const labels = useChartLabels();
	const showsChart = !isDailyPending && !isDailyError;
	const isWaitingForEverything = isLoading && isDailyPending;
	const isFirstLoad = isWaitingForEverything && !isCountsError;

	if (isFirstLoad) {
		return <TimeActivityReportSheetSkeleton isManager={isManager} />;
	}

	return (
		<section aria-label={t('dashboard.timeActivity.sheet.LABEL')} className={DASHBOARD_SURFACE}>
			<TimeActivitySummaryBand
				figures={figures}
				isManager={isManager}
				isLoading={isLoading}
				actions={exportSlot}
			/>
			{isCountsError && <DashboardErrorNotice onRetry={onRetryCounts} className="mx-2 mb-2" />}
			<div className={CHART_PART}>
				<ChartHeader legend={showsChart && <ChartLegend days={chartDays} />} />
				{isDailyPending && <TimeActivityAreaChartSkeleton />}
				{isDailyError && <DashboardErrorNotice onRetry={onRetryDaily} />}
				{showsChart && <TimeActivityAreaChart days={chartDays} labels={labels} />}
			</div>
		</section>
	);
}
