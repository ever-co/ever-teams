'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { BlockEmptyMessage } from '@/core/components/dashboards/kit/dashboard-states';
import {
	DASHBOARD_STACK,
	DASHBOARD_SURFACE,
	SECTION_TITLE,
	SKELETON_BAR
} from '@/core/components/dashboards/kit/recipes';
import { Lock } from '@/core/components/icons';
import {
	type AreaChartLabels,
	TimeActivityAreaChart,
	TimeActivityAreaChartSkeleton
} from '@/core/components/dashboards/time-activity/time-activity-area-chart';
import {
	TimeActivityBreakdown,
	breakdownColumnsOf
} from '@/core/components/dashboards/time-activity/time-activity-breakdown';
import { APP_NAME } from '@/core/constants/config/constants';
import { useWorkspaceLocale } from '@/core/hooks/common/use-workspace-locale';
import { queryKeys } from '@/core/query/keys';
import { savedReportService } from '@/core/services/client/api/timesheets/saved-report.service';
import { cn } from '@/core/lib/helpers';
import { daysOfPeriod, formatPeriod, type Period } from '@/core/lib/utils/dashboard-period';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import {
	dayFiguresOf,
	earningsByCurrencyOf,
	flattenDailyReport,
	formatAmounts
} from '@/core/lib/utils/daily-report-figures';
import { dailyReportOfPublic, periodOfPublicReport } from '@/core/lib/utils/dashboards/saved-report';
import {
	type ChartDayLabels,
	type TimeActivityRow,
	breakdownGroupingOf,
	chartDaysOf,
	clientOfProjectLogOf,
	clientRowsOf,
	todayKeyOf
} from '@/core/lib/utils/dashboards/time-activity';
import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import { dateFormatOf, type FormatLocale } from '@/core/lib/utils/workspace-formats';
import type { IPublicSavedReport } from '@/core/types/interfaces/timesheet/saved-report';

const NOT_FOUND = 404;

const PAGE = 'mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-10 sm:px-6';

const FIGURE = 'flex min-w-0 flex-col gap-0.5';

function shouldRetryRead(failureCount: number, error: unknown) {
	const status = errorStatusOf(error);
	const isRefusal = status !== null && status < 500;
	if (isRefusal) {
		return false;
	}
	return failureCount < 2;
}

function useSharedReport(token: string) {
	return useQuery({
		queryKey: queryKeys.savedReports.shared(token),
		queryFn: () => savedReportService.readShared(token),
		enabled: Boolean(token),
		staleTime: 60_000,
		retry: shouldRetryRead
	});
}

function SharedReportHeader() {
	const t = useTranslations();
	return (
		<header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
			<span className="truncate text-sm font-semibold text-foreground">{APP_NAME}</span>
			<span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foreground/[0.06] px-2.5 py-1 text-xs text-muted-foreground">
				<Lock className="size-3.5" aria-hidden="true" />
				{t('sharedReport.READ_ONLY_BADGE')}
			</span>
		</header>
	);
}

function NotWorking() {
	const t = useTranslations();
	return (
		<div className={cn(DASHBOARD_SURFACE, 'mt-6')}>
			<BlockEmptyMessage
				title={t('sharedReport.NOT_WORKING_TITLE')}
				message={t('sharedReport.NOT_WORKING_MESSAGE')}
			/>
		</div>
	);
}

function ReadError({ onRetry }: Readonly<{ onRetry: () => void }>) {
	const t = useTranslations();
	return (
		<div className={cn(DASHBOARD_SURFACE, 'mt-6')}>
			<BlockEmptyMessage
				title={t('sharedReport.ERROR_TITLE')}
				message={t('sharedReport.ERROR_MESSAGE')}
				action={
					<Button type="button" variant="outline" onClick={onRetry}>
						{t('pages.unauthorized.TRY_AGAIN')}
					</Button>
				}
			/>
		</div>
	);
}

function SharedReportSkeleton() {
	const t = useTranslations();
	return (
		<output className={PAGE} aria-label={t('sharedReport.LOADING')}>
			<div className="flex flex-col gap-2 pt-2">
				<span className={cn(SKELETON_BAR, 'h-6 w-64 max-w-full')} />
				<span className={cn(SKELETON_BAR, 'h-3 w-40')} />
			</div>
			<div className={cn(DASHBOARD_SURFACE, 'flex flex-col gap-4 p-4')}>
				<span className={cn(SKELETON_BAR, 'h-4 w-48')} />
				<TimeActivityAreaChartSkeleton />
			</div>
		</output>
	);
}

function axisFormatOptionsOf(dayCount: number): Intl.DateTimeFormatOptions {
	if (dayCount <= 7) {
		return { weekday: 'short' };
	}
	return { day: 'numeric' };
}

function chartLabelsOf(locale: FormatLocale, dayCount: number): ChartDayLabels {
	const labelFormat = dateFormatOf(locale, { weekday: 'long', month: 'short', day: 'numeric' });
	const axisFormat = dateFormatOf(locale, axisFormatOptionsOf(dayCount));
	return {
		label: (day) => labelFormat.format(day),
		axisLabel: (day) => axisFormat.format(day)
	};
}

/** The project of each entry names its client: a client grouping reads it from there. */
function projectClientIdsOf(report: IPublicSavedReport): Map<string, string | null> {
	const clientIds = new Map<string, string | null>();
	for (const day of report.days) {
		for (const projectLog of day.logs) {
			const projectId = projectLog.project?.id;
			if (!projectId) {
				continue;
			}
			clientIds.set(projectId, projectLog.project?.organizationContact?.id ?? null);
		}
	}
	return clientIds;
}

function rowsOfSharedReport(report: IPublicSavedReport, withoutTeamLabel: string): TimeActivityRow[] {
	const daily = dailyReportOfPublic(report);
	if (report.grouping !== 'client') {
		return flattenDailyReport(daily, withoutTeamLabel, null);
	}
	const clientOf = clientOfProjectLogOf(projectClientIdsOf(report), new Map());
	return clientRowsOf(daily, clientOf, withoutTeamLabel, null);
}

function generatedTimeOf(report: IPublicSavedReport, locale: FormatLocale) {
	const generatedAt = new Date(report.generatedAt);
	if (Number.isNaN(generatedAt.getTime())) {
		return '';
	}
	return dateFormatOf(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(generatedAt);
}

/** The amounts are summed from the rows, as the report page and the table's total sum them, so the three agree. */
function Figures({
	report,
	rows,
	memberCount
}: Readonly<{ report: IPublicSavedReport; rows: ReadonlyArray<TimeActivityRow>; memberCount: number }>) {
	const t = useTranslations();
	const locale = useWorkspaceLocale();
	const amounts = useMemo(() => earningsByCurrencyOf(rows), [rows]);
	const showsAmounts = report.includeAmounts && amounts.length > 0;
	return (
		<dl className="flex flex-wrap gap-x-8 gap-y-3 px-4 py-3">
			<div className={FIGURE}>
				<dt className="text-xs text-muted-foreground">{t('dashboard.timeActivity.figures.TRACKED')}</dt>
				<dd className="text-lg font-semibold tabular-nums text-foreground">
					{formatDurationShort(report.totals.duration)}
				</dd>
			</div>
			{showsAmounts && (
				<div className={FIGURE}>
					<dt className="text-xs text-muted-foreground">{t('dashboard.timeActivity.columns.EARNINGS')}</dt>
					<dd className="truncate text-lg font-semibold tabular-nums text-foreground">
						{formatAmounts(amounts, locale)}
					</dd>
				</div>
			)}
			<div className={FIGURE}>
				<dt className="text-xs text-muted-foreground">{t('dashboard.timeActivity.figures.MEMBERS')}</dt>
				<dd className="text-lg font-semibold tabular-nums text-foreground">{memberCount}</dd>
			</div>
		</dl>
	);
}

const NO_ACTION = () => undefined;

function SharedReportContent({ report, period }: Readonly<{ report: IPublicSavedReport; period: Period }>) {
	const t = useTranslations();
	const locale = useWorkspaceLocale();
	const rows = useMemo(() => rowsOfSharedReport(report, t('dashboard.NO_TEAM_GROUP')), [report, t]);
	const grouping = breakdownGroupingOf(report.grouping ?? 'date');
	const columns = useMemo(
		() => breakdownColumnsOf(grouping, ['activity'], report.includeAmounts),
		[grouping, report.includeAmounts]
	);
	const chartDays = useMemo(() => {
		const days = daysOfPeriod(period);
		return chartDaysOf(days, dayFiguresOf(rows), todayKeyOf(), chartLabelsOf(locale, days.length));
	}, [locale, period, rows]);
	const chartLabels = useMemo<AreaChartLabels>(
		() => ({
			ariaLabel: t('dashboard.timeActivity.sheet.CHART_LABEL'),
			tracked: t('dashboard.timeActivity.chart.TRACKED'),
			activity: t('dashboard.timeActivity.columns.ACTIVITY'),
			empty: t('dashboard.timeActivity.chart.EMPTY')
		}),
		[t]
	);
	const memberCount = useMemo(() => new Set(rows.map((row) => row.employeeId)).size, [rows]);
	const hasRows = rows.length > 0;

	return (
		<div className={DASHBOARD_STACK}>
			<section aria-label={t('dashboard.timeActivity.sheet.LABEL')} className={DASHBOARD_SURFACE}>
				<Figures report={report} rows={rows} memberCount={memberCount} />
				<div className="px-4 pt-1 pb-4">
					<TimeActivityAreaChart days={chartDays} labels={chartLabels} />
				</div>
			</section>
			{!hasRows && (
				<div className={DASHBOARD_SURFACE}>
					<BlockEmptyMessage title={t('sharedReport.EMPTY')} />
				</div>
			)}
			{hasRows && (
				<TimeActivityBreakdown
					grouping={grouping}
					rows={rows}
					columns={columns}
					period={period}
					isLoading={false}
					isError={false}
					hasFilters={false}
					onRetry={NO_ACTION}
					onClearFilters={NO_ACTION}
					onPreviousPeriod={NO_ACTION}
				/>
			)}
		</div>
	);
}

function SharedReport({ report }: Readonly<{ report: IPublicSavedReport }>) {
	const t = useTranslations();
	const locale = useWorkspaceLocale();
	const period = periodOfPublicReport(report);
	if (!period) {
		return <NotWorking />;
	}
	return (
		<div className={PAGE}>
			<div className="flex min-w-0 flex-col gap-1 pt-2">
				<h1 className="truncate text-xl font-semibold text-foreground" title={report.name}>
					{report.name}
				</h1>
				<p className={cn(SECTION_TITLE, 'text-muted-foreground')}>{formatPeriod(period, locale)}</p>
				<p className="text-xs text-muted-foreground">
					{t('sharedReport.READ_ONLY', { app: APP_NAME, time: generatedTimeOf(report, locale) })}
				</p>
			</div>
			<SharedReportContent report={report} period={period} />
		</div>
	);
}

/**
 * A saved report read through its link, without an account: its name, period, figures, chart and table, read only. No
 * navigation and nothing to change. A link that does not work (unknown, turned off, replaced or ended) says so.
 */
export function SharedReportPage({ token }: Readonly<{ token: string }>) {
	const query = useSharedReport(token);
	const isGone = query.isError && errorStatusOf(query.error) === NOT_FOUND;
	const isFailed = query.isError && !isGone;
	return (
		<div className="min-h-dvh bg-background">
			<SharedReportHeader />
			<main>
				{query.isPending && <SharedReportSkeleton />}
				{isGone && (
					<div className={PAGE}>
						<NotWorking />
					</div>
				)}
				{isFailed && (
					<div className={PAGE}>
						<ReadError onRetry={() => void query.refetch()} />
					</div>
				)}
				{/* A later read that failed hides the report read before: a link turned off shows no figures */}
				{query.data && !query.isError && <SharedReport report={query.data} />}
			</main>
		</div>
	);
}
