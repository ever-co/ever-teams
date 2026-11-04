'use client';

import { type ReactNode, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { DayBarsChart, type DayBarDatum } from '@/core/components/dashboards/kit/day-bars-chart';
import { DashboardErrorNotice, DayBarsSkeleton, RowsSkeleton } from '@/core/components/dashboards/kit/dashboard-states';
import { MetricStrip, type MetricItem } from '@/core/components/dashboards/kit/metric-strip';
import {
	DASHBOARD_SURFACE,
	SECTION_HEADER,
	SECTION_META,
	SECTION_TITLE
} from '@/core/components/dashboards/kit/recipes';
import { ShareBar, ShareRows } from '@/core/components/dashboards/kit/share-rows';
import { SegmentedControl, type SegmentedControlItem } from '@/core/components/common/segmented-control';
import type { TeamDashboardState } from '@/core/hooks/dashboards/team/use-team-dashboard';
import { cn } from '@/core/lib/helpers';
import {
	formatDurationShort,
	formatHoursLabel,
	formatPercent,
	type ShareRow,
	type TimeAxis,
	timeAxisOf
} from '@/core/lib/utils/dashboard-figures';
import { periodLengthInDays } from '@/core/lib/utils/dashboard-period';
import {
	type ChartBucket,
	type ChartGranularity,
	chartValueOf,
	countAxisOf,
	PERCENT_AXIS,
	type ProjectShareItem,
	type TeamFigureKey
} from '@/core/lib/utils/dashboards/team';
import type { ITimesheetCountsStatistics } from '@/core/types/interfaces/timesheet/timesheet';
import { ProjectMark } from './team-marks';

const MISSING_FIGURE = '–';
const SHORT_PERIOD_DAYS = 7;

type Translate = ReturnType<typeof useTranslations>;

function isFigure(value: number | undefined | null): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

function durationOrMissing(seconds: number | undefined) {
	if (!isFigure(seconds)) {
		return MISSING_FIGURE;
	}
	return formatDurationShort(seconds);
}

function percentOrMissing(percent: number | undefined) {
	if (!isFigure(percent)) {
		return MISSING_FIGURE;
	}
	return formatPercent(percent);
}

function countOrMissing(count: number | undefined, numberFormat: Intl.NumberFormat) {
	if (!isFigure(count)) {
		return MISSING_FIGURE;
	}
	return numberFormat.format(count);
}

function todayHintOf(value: number | undefined, format: (value: number) => string, t: Translate) {
	if (!isFigure(value)) {
		return undefined;
	}
	return t('dashboard.team.figures.TODAY', { value: format(value) });
}

function perMemberHintOf(counts: ITimesheetCountsStatistics | null, t: Translate) {
	const seconds = counts?.weekDuration;
	const memberCount = counts?.employeesCount;
	const hasSeconds = isFigure(seconds);
	const hasMembers = isFigure(memberCount) && memberCount > 0;
	if (!hasSeconds || !hasMembers) {
		return undefined;
	}
	const perMember = formatDurationShort(seconds / memberCount);
	return t('dashboard.team.figures.PER_MEMBER', { value: perMember });
}

function projectNameOf(item: ProjectShareItem, t: Translate) {
	if (item.isNoProject) {
		return t('dashboard.team.projects.NONE');
	}
	return item.name || t('dashboard.team.projects.NONE');
}

function topProjectHintOf(shares: ReadonlyArray<ShareRow<ProjectShareItem>>, t: Translate) {
	const top = shares[0];
	const topItem = top?.item;
	if (!topItem) {
		return undefined;
	}
	return t('dashboard.team.figures.TOP_PROJECT', { name: projectNameOf(topItem, t) });
}

interface DateFormats {
	dayLong: Intl.DateTimeFormat;
	dayLongWithYear: Intl.DateTimeFormat;
	weekdayShort: Intl.DateTimeFormat;
	monthDay: Intl.DateTimeFormat;
	monthYear: Intl.DateTimeFormat;
	monthShort: Intl.DateTimeFormat;
	dayNumber: Intl.DateTimeFormat;
	number: Intl.NumberFormat;
}

function dateFormatsOf(locale: string): DateFormats {
	return {
		dayLong: new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'short', day: 'numeric' }),
		dayLongWithYear: new Intl.DateTimeFormat(locale, {
			weekday: 'long',
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}),
		weekdayShort: new Intl.DateTimeFormat(locale, { weekday: 'short' }),
		monthDay: new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }),
		monthYear: new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }),
		monthShort: new Intl.DateTimeFormat(locale, { month: 'short' }),
		dayNumber: new Intl.DateTimeFormat(locale, { day: 'numeric' }),
		number: new Intl.NumberFormat(locale)
	};
}

function isCurrentYear(date: Date) {
	return date.getFullYear() === new Date().getFullYear();
}

function dayLabelOf(date: Date, formats: DateFormats) {
	if (isCurrentYear(date)) {
		return formats.dayLong.format(date);
	}
	return formats.dayLongWithYear.format(date);
}

function dayAxisLabelOf(date: Date, formats: DateFormats, periodDays: number) {
	if (periodDays <= SHORT_PERIOD_DAYS) {
		return formats.weekdayShort.format(date);
	}
	const isFirstOfMonth = date.getDate() === 1;
	if (isFirstOfMonth) {
		return formats.monthDay.format(date);
	}
	return formats.dayNumber.format(date);
}

function bucketLabelsOf(
	bucket: ChartBucket,
	granularity: ChartGranularity,
	formats: DateFormats,
	periodDays: number,
	t: Translate
) {
	if (granularity === 'week') {
		const weekStart = formats.monthDay.format(bucket.start);
		const weekLabel = t('dashboard.team.chart.WEEK_OF', { date: weekStart });
		return { label: weekLabel, axisLabel: weekStart };
	}
	if (granularity === 'month') {
		const monthLabel = formats.monthYear.format(bucket.start);
		const monthAxisLabel = formats.monthShort.format(bucket.start);
		return { label: monthLabel, axisLabel: monthAxisLabel };
	}
	const dayLabel = dayLabelOf(bucket.start, formats);
	const dayAxisLabel = dayAxisLabelOf(bucket.start, formats, periodDays);
	return { label: dayLabel, axisLabel: dayAxisLabel };
}

function chartDatumOf(
	bucket: ChartBucket,
	figure: TeamFigureKey,
	labels: { label: string; axisLabel: string }
): DayBarDatum {
	const datum: DayBarDatum = {
		key: bucket.key,
		label: labels.label,
		axisLabel: labels.axisLabel,
		value: chartValueOf(bucket, figure),
		isToday: bucket.isToday,
		isFuture: bucket.isFuture
	};
	if (figure === 'tracked') {
		datum.part = bucket.activeSeconds;
	}
	return datum;
}

function maxValueOf(data: ReadonlyArray<DayBarDatum>) {
	let max = 0;
	for (const datum of data) {
		max = Math.max(max, datum.value);
	}
	return max;
}

function axisOf(figure: TeamFigureKey, maxValue: number, limit: number | undefined): TimeAxis {
	if (figure === 'activity') {
		return PERCENT_AXIS;
	}
	if (figure === 'tracked') {
		const ceiling = Math.max(maxValue, limit ?? 0);
		return timeAxisOf(ceiling);
	}
	return countAxisOf(maxValue);
}

interface FigureFormat {
	formatValue: (value: number) => string;
	formatTick: (value: number) => string;
}

function figureFormatOf(figure: TeamFigureKey, numberFormat: Intl.NumberFormat): FigureFormat {
	if (figure === 'tracked') {
		return { formatValue: formatDurationShort, formatTick: formatHoursLabel };
	}
	if (figure === 'activity') {
		return { formatValue: formatPercent, formatTick: formatPercent };
	}
	const formatCount = (value: number) => numberFormat.format(value);
	return { formatValue: formatCount, formatTick: formatCount };
}

function peakOf(data: ReadonlyArray<DayBarDatum>) {
	let peak: DayBarDatum | null = null;
	for (const datum of data) {
		const isCandidate = !datum.isFuture && datum.value > 0;
		const isHigher = datum.value > (peak?.value ?? 0);
		if (isCandidate && isHigher) {
			peak = datum;
		}
	}
	return peak;
}

const FIGURE_LABEL_KEYS = {
	tracked: 'dashboard.team.figures.TRACKED',
	activity: 'dashboard.team.figures.ACTIVITY',
	members: 'dashboard.team.figures.MEMBERS',
	projects: 'dashboard.team.figures.PROJECTS'
} as const;

const VALUE_LABEL_KEYS = {
	tracked: 'dashboard.team.chart.VALUE_TRACKED',
	activity: 'dashboard.team.chart.VALUE_ACTIVITY',
	members: 'dashboard.team.chart.VALUE_MEMBERS',
	projects: 'dashboard.team.chart.VALUE_PROJECTS'
} as const;

const GRANULARITY_LABEL_KEYS = {
	day: 'dashboard.team.chart.DAY',
	week: 'dashboard.team.chart.WEEK',
	month: 'dashboard.team.chart.MONTH'
} as const;

function emptyChartSentenceOf(hasFilters: boolean, t: Translate) {
	if (hasFilters) {
		return t('dashboard.team.chart.EMPTY_FILTERED');
	}
	return t('dashboard.team.chart.EMPTY');
}

function TeamChartFrame({
	title,
	meta,
	controls,
	isBusy = false,
	children
}: Readonly<{ title: string; meta?: string | null; controls?: ReactNode; isBusy?: boolean; children: ReactNode }>) {
	return (
		<div className="flex min-w-0 flex-col" aria-busy={isBusy}>
			<div className={SECTION_HEADER}>
				<div className="flex min-w-0 items-baseline gap-2">
					<h2 className={SECTION_TITLE}>{title}</h2>
					{meta && <span className={cn(SECTION_META, 'truncate')}>{meta}</span>}
				</div>
				{controls}
			</div>
			<div className="px-4 pt-2 pb-4">{children}</div>
		</div>
	);
}

function TeamChart({ dashboard }: Readonly<{ dashboard: TeamDashboardState }>) {
	const t = useTranslations();
	const locale = useLocale();
	const { buckets, figure, granularity, chartPeriod, limitSeconds, rows, hasFilters } = dashboard;
	const formats = useMemo(() => dateFormatsOf(locale), [locale]);
	const periodDays = periodLengthInDays(chartPeriod);

	const data = useMemo(
		() =>
			buckets.map((bucket) => {
				const labels = bucketLabelsOf(bucket, granularity, formats, periodDays, t);
				return chartDatumOf(bucket, figure, labels);
			}),
		[buckets, figure, formats, granularity, periodDays, t]
	);

	const maxValue = maxValueOf(data);
	const axis = axisOf(figure, maxValue, limitSeconds);
	const { formatValue, formatTick } = figureFormatOf(figure, formats.number);
	const peak = peakOf(data);
	let peakText: string | null = null;
	if (peak) {
		const peakValue = formatValue(peak.value);
		peakText = t('dashboard.team.chart.PEAK', { label: peak.label, value: peakValue });
	}
	const figureLabel = t(FIGURE_LABEL_KEYS[figure]);
	const isEmpty = rows.length === 0;
	const hasLimit = typeof limitSeconds === 'number';

	let limitLabel: string | undefined;
	if (hasLimit) {
		const standardDay = formatHoursLabel(limitSeconds);
		limitLabel = t('dashboard.team.chart.STANDARD_DAY', { value: standardDay });
	}

	let partLabel: string | undefined;
	if (figure === 'tracked') {
		partLabel = t('dashboard.team.chart.VALUE_ACTIVE');
	}

	const granularityItems: SegmentedControlItem<ChartGranularity>[] = dashboard.granularityOptions.map((option) => ({
		value: option,
		label: t(GRANULARITY_LABEL_KEYS[option])
	}));
	const showsGranularity = granularityItems.length > 0;

	let body = (
		<div className="relative">
			<DayBarsChart
				data={data}
				axis={axis}
				ariaLabel={t('dashboard.team.chart.LABEL', { figure: figureLabel })}
				valueLabel={t(VALUE_LABEL_KEYS[figure])}
				partLabel={partLabel}
				formatValue={formatValue}
				formatTick={formatTick}
				limit={limitSeconds}
				limitLabel={limitLabel}
			/>
			{isEmpty && (
				<div className="pointer-events-none absolute inset-x-0 top-0 flex h-48 items-center justify-center pl-11">
					<p className="rounded-md bg-card px-3 py-1.5 text-center text-[13px] text-muted-foreground text-balance">
						{emptyChartSentenceOf(hasFilters, t)}
					</p>
				</div>
			)}
		</div>
	);
	if (dashboard.isReportLoading) {
		body = <DayBarsSkeleton />;
	}
	if (dashboard.isReportError) {
		body = <DashboardErrorNotice onRetry={dashboard.refetchReport} className="my-8" />;
	}

	return (
		<TeamChartFrame
			title={figureLabel}
			meta={peakText}
			isBusy={dashboard.isRefreshing}
			controls={
				showsGranularity && (
					<SegmentedControl
						items={granularityItems}
						value={granularity}
						onValueChange={dashboard.setGranularity}
						ariaLabel={t('dashboard.team.chart.GROUP_BY')}
					/>
				)
			}
		>
			{body}
		</TeamChartFrame>
	);
}

const SHARE_SKELETON_GRID = 'grid grid-cols-[2.75rem_minmax(0,1fr)_5rem] items-center gap-x-3 px-4';

function ProjectSharesSkeleton() {
	return <RowsSkeleton rows={4} gridClassName={SHARE_SKELETON_GRID} cellCount={2} withAvatar={false} />;
}

function TeamProjectsFrame({ meta, children }: Readonly<{ meta?: string | null; children: ReactNode }>) {
	const t = useTranslations();
	return (
		<aside
			aria-label={t('dashboard.team.projects.TITLE')}
			className="flex min-w-0 flex-col border-border max-xl:hairline-t xl:hairline-l"
		>
			<div className={SECTION_HEADER}>
				<h2 className={SECTION_TITLE}>{t('dashboard.team.projects.TITLE')}</h2>
				{meta && <span className={SECTION_META}>{meta}</span>}
			</div>
			{children}
		</aside>
	);
}

function TeamProjectsBreakdown({ dashboard }: Readonly<{ dashboard: TeamDashboardState }>) {
	const t = useTranslations();
	const { projectShares, totals } = dashboard;
	const hasShares = projectShares.length > 0;

	let body: ReactNode = (
		<>
			<ShareBar rows={projectShares} className="mx-4 mt-1 mb-3 w-auto" />
			<ShareRows
				rows={projectShares}
				renderName={(item) => (
					<>
						<ProjectMark imageUrl={item.imageUrl} color={item.color} isNoProject={item.isNoProject} />
						<span className="truncate">{projectNameOf(item, t)}</span>
					</>
				)}
				formatValue={formatDurationShort}
				otherLabel={(count) => t('dashboard.team.projects.OTHER', { count })}
				className="hairline-t border-border"
			/>
		</>
	);
	if (!hasShares) {
		body = <p className="px-4 pt-1 pb-6 text-xs text-muted-foreground">{t('dashboard.team.projects.EMPTY')}</p>;
	}
	if (dashboard.isReportLoading) {
		body = <ProjectSharesSkeleton />;
	}
	if (dashboard.isReportError) {
		body = null;
	}

	let meta: string | null = null;
	if (hasShares) {
		meta = t('dashboard.team.projects.COUNT', { count: totals.projectCount });
	}

	return <TeamProjectsFrame meta={meta}>{body}</TeamProjectsFrame>;
}

const STRIP_CLASS = 'hairline-b border-border';

const OVERVIEW_GRID = 'grid xl:grid-cols-[minmax(0,1fr)_24rem]';

const FIGURE_KEYS: ReadonlyArray<TeamFigureKey> = ['tracked', 'activity', 'members', 'projects'];

function keepFigure() {
	return undefined;
}

function labelItemOf(key: TeamFigureKey, t: Translate): MetricItem<TeamFigureKey> {
	const label = t(FIGURE_LABEL_KEYS[key]);
	return { key, label, value: null };
}

/** The chart and the projects come from the daily report the table reads too: no request of their own. */
export function TeamOverview({ dashboard }: Readonly<{ dashboard: TeamDashboardState }>) {
	const t = useTranslations();
	const locale = useLocale();
	const { counts, projectShares } = dashboard;
	const numberFormat = useMemo(() => new Intl.NumberFormat(locale), [locale]);

	const items = useMemo<MetricItem<TeamFigureKey>[]>(
		() => [
			{
				key: 'tracked',
				label: t('dashboard.team.figures.TRACKED'),
				value: durationOrMissing(counts?.weekDuration),
				hint: todayHintOf(counts?.todayDuration, formatDurationShort, t)
			},
			{
				key: 'activity',
				label: t('dashboard.team.figures.ACTIVITY'),
				value: percentOrMissing(counts?.weekActivities),
				hint: todayHintOf(counts?.todayActivities, formatPercent, t)
			},
			{
				key: 'members',
				label: t('dashboard.team.figures.MEMBERS'),
				value: countOrMissing(counts?.employeesCount, numberFormat),
				hint: perMemberHintOf(counts, t)
			},
			{
				key: 'projects',
				label: t('dashboard.team.figures.PROJECTS'),
				value: countOrMissing(counts?.projectsCount, numberFormat),
				hint: topProjectHintOf(projectShares, t)
			}
		],
		[counts, numberFormat, projectShares, t]
	);

	const isFirstLoad = dashboard.isCountsLoading && dashboard.isReportLoading;
	if (isFirstLoad) {
		return <TeamOverviewSkeleton figure={dashboard.figure} onFigureChange={dashboard.setFigure} />;
	}

	return (
		<section aria-label={t('dashboard.team.figures.LABEL')} className={DASHBOARD_SURFACE}>
			{dashboard.isCountsError && <DashboardErrorNotice onRetry={dashboard.refetchStatistics} className="m-3" />}
			<MetricStrip
				items={items}
				ariaLabel={t('dashboard.team.figures.LABEL')}
				isLoading={dashboard.isCountsLoading}
				selectedKey={dashboard.figure}
				onSelect={dashboard.setFigure}
				className={STRIP_CLASS}
			/>
			<div className={OVERVIEW_GRID}>
				<TeamChart dashboard={dashboard} />
				<TeamProjectsBreakdown dashboard={dashboard} />
			</div>
		</section>
	);
}

/** Drawn by the route skeleton and by the page on its first load: one picture from the route to the data. */
export function TeamOverviewSkeleton({
	figure = 'tracked',
	onFigureChange = keepFigure
}: Readonly<{ figure?: TeamFigureKey; onFigureChange?: (figure: TeamFigureKey) => void }>) {
	const t = useTranslations();
	const items = useMemo(() => FIGURE_KEYS.map((key) => labelItemOf(key, t)), [t]);
	return (
		<section aria-label={t('dashboard.team.figures.LABEL')} className={DASHBOARD_SURFACE}>
			<MetricStrip
				items={items}
				ariaLabel={t('dashboard.team.figures.LABEL')}
				isLoading
				selectedKey={figure}
				onSelect={onFigureChange}
				className={STRIP_CLASS}
			/>
			<div className={OVERVIEW_GRID}>
				<TeamChartFrame title={t(FIGURE_LABEL_KEYS[figure])}>
					<DayBarsSkeleton />
				</TeamChartFrame>
				<TeamProjectsFrame>
					<ProjectSharesSkeleton />
				</TeamProjectsFrame>
			</div>
		</section>
	);
}
