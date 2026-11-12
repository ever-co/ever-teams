'use client';

import { memo, type ReactNode, useMemo } from 'react';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { DashboardSection } from '@/core/components/dashboards/kit/dashboard-layout';
import { DashboardErrorNotice, DayBarsSkeleton } from '@/core/components/dashboards/kit/dashboard-states';
import { DayBarsChart, type DayBarDatum } from '@/core/components/dashboards/kit/day-bars-chart';
import { ActivityMeter } from '@/core/components/dashboards/kit/meters';
import { type MetricItem, MetricStrip } from '@/core/components/dashboards/kit/metric-strip';
import { SECTION_TITLE } from '@/core/components/dashboards/kit/recipes';
import type { TimeActivityFigures } from '@/core/hooks/dashboards/time-activity/use-time-activity-report';
import {
	type ActivityBand,
	activityBandOf,
	formatDurationShort,
	formatHoursLabel,
	timeAxisOf
} from '@/core/lib/utils/dashboard-figures';
import { formatAmounts } from '@/core/lib/utils/daily-report-figures';
import { maxSecondsOf } from '@/core/lib/utils/dashboards/time-activity';
import { useWorkspaceLocale } from '@/core/hooks/common/use-workspace-locale';
import type { FormatLocale } from '@/core/lib/utils/workspace-formats';

type FigureKey = 'tracked' | 'activity' | 'earnings' | 'members';

const BAND_LABEL_KEYS: Record<ActivityBand, DottedLanguageObjectStringPaths> = {
	low: 'dashboard.timeActivity.figures.ACTIVITY_LOW',
	medium: 'dashboard.timeActivity.figures.ACTIVITY_MEDIUM',
	high: 'dashboard.timeActivity.figures.ACTIVITY_HIGH'
};

const FIGURE_LABEL_KEYS: Record<FigureKey, DottedLanguageObjectStringPaths> = {
	tracked: 'dashboard.timeActivity.figures.TRACKED',
	activity: 'dashboard.timeActivity.figures.ACTIVITY',
	earnings: 'dashboard.timeActivity.figures.EARNINGS',
	members: 'dashboard.timeActivity.figures.MEMBERS'
};

const MISSING_VALUE = '–';

type Translate = ReturnType<typeof useTranslations>;

function figureKeysOf(isManager: boolean): FigureKey[] {
	const keys: FigureKey[] = ['tracked', 'activity'];
	if (isManager) {
		keys.push('earnings');
	}
	keys.push('members');
	return keys;
}

function labelItemOf(key: FigureKey, t: Translate): MetricItem<FigureKey> {
	const label = t(FIGURE_LABEL_KEYS[key]);
	return { key, label, value: MISSING_VALUE };
}

function trackedItemOf(figures: TimeActivityFigures, t: Translate): MetricItem<FigureKey> {
	const label = t(FIGURE_LABEL_KEYS.tracked);
	if (figures.trackedSeconds === null) {
		return { key: 'tracked', label, value: MISSING_VALUE, hint: t('dashboard.timeActivity.figures.UNAVAILABLE') };
	}
	return {
		key: 'tracked',
		label,
		value: formatDurationShort(figures.trackedSeconds),
		hint: t('dashboard.timeActivity.figures.TRACKED_DAYS', { count: figures.totals.dayCount })
	};
}

function activityItemOf(figures: TimeActivityFigures, t: Translate): MetricItem<FigureKey> {
	const label = t(FIGURE_LABEL_KEYS.activity);
	const percent = figures.activityPercent;
	if (percent === null) {
		return { key: 'activity', label, value: MISSING_VALUE, hint: t('dashboard.timeActivity.figures.UNAVAILABLE') };
	}
	const trackedSeconds = figures.trackedSeconds ?? 0;
	const hasTime = trackedSeconds > 0;
	if (!hasTime) {
		return { key: 'activity', label, value: MISSING_VALUE, hint: t('dashboard.timeActivity.figures.NO_TIME') };
	}
	const rounded = Math.round(percent);
	return {
		key: 'activity',
		label,
		value: (
			<span className="inline-flex items-center gap-2.5">
				<span>{rounded}%</span>
				<ActivityMeter percent={rounded} />
			</span>
		),
		hint: t(BAND_LABEL_KEYS[activityBandOf(rounded)])
	};
}

function earningsHintOf(figures: TimeActivityFigures, t: Translate) {
	const { totals } = figures;
	const hasTime = totals.seconds > 0;
	if (!hasTime) {
		return t('dashboard.timeActivity.figures.NO_TIME');
	}
	const hasEarnings = totals.earnings.length > 0;
	if (!hasEarnings) {
		return t('dashboard.timeActivity.figures.EARNINGS_NO_RATES');
	}
	const hasMissingRates = totals.membersWithoutRate > 0;
	if (hasMissingRates) {
		return t('dashboard.timeActivity.figures.EARNINGS_MISSING_RATES', { count: totals.membersWithoutRate });
	}
	return t('dashboard.timeActivity.figures.EARNINGS_FROM_RATES');
}

function earningsValueOf(figures: TimeActivityFigures, locale: FormatLocale) {
	const amounts = figures.totals.earnings;
	const hasEarnings = amounts.length > 0;
	if (!hasEarnings) {
		return MISSING_VALUE;
	}
	return formatAmounts(amounts, locale);
}

function earningsItemOf(figures: TimeActivityFigures, locale: FormatLocale, t: Translate): MetricItem<FigureKey> {
	const value = earningsValueOf(figures, locale);
	return {
		key: 'earnings',
		label: t(FIGURE_LABEL_KEYS.earnings),
		value: <span title={value}>{value}</span>,
		hint: earningsHintOf(figures, t)
	};
}

function membersItemOf(figures: TimeActivityFigures, t: Translate): MetricItem<FigureKey> {
	const { totals } = figures;
	return {
		key: 'members',
		label: t(FIGURE_LABEL_KEYS.members),
		value: totals.memberCount,
		hint: t('dashboard.timeActivity.figures.MEMBERS_PROJECTS', { count: totals.projectCount })
	};
}

function ChartLegend() {
	const t = useTranslations();
	return (
		<span className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
			<span className="inline-flex items-center gap-1.5">
				<span className="size-2 rounded-[2px] bg-primary/20" />
				{t('dashboard.timeActivity.chart.TRACKED')}
			</span>
			<span className="inline-flex items-center gap-1.5">
				<span className="size-2 rounded-[2px] bg-primary" />
				{t('dashboard.timeActivity.chart.ACTIVE')}
			</span>
		</span>
	);
}

const CHART_HEIGHT = 'h-44';

const DayChart = memo(function DayChart({ days, isEmpty }: Readonly<{ days: DayBarDatum[]; isEmpty: boolean }>) {
	const t = useTranslations();
	const axis = useMemo(() => timeAxisOf(maxSecondsOf(days)), [days]);
	return (
		<div className="relative">
			<DayBarsChart
				data={days}
				axis={axis}
				ariaLabel={t('dashboard.timeActivity.chart.TITLE')}
				valueLabel={t('dashboard.timeActivity.chart.TRACKED')}
				partLabel={t('dashboard.timeActivity.chart.ACTIVE')}
				formatValue={formatDurationShort}
				formatTick={formatHoursLabel}
				heightClassName={CHART_HEIGHT}
			/>
			{isEmpty && (
				<div className="pointer-events-none absolute inset-x-0 top-0 flex h-44 items-center justify-center">
					<p className="rounded-full bg-card px-3 py-1 text-xs text-muted-foreground hairline-ring ring-border">
						{t('dashboard.timeActivity.chart.EMPTY')}
					</p>
				</div>
			)}
		</div>
	);
});

function ChartPart({ children }: Readonly<{ children: ReactNode }>) {
	const t = useTranslations();
	return (
		<div className="flex flex-col gap-3 px-4 pt-3 pb-4 hairline-t border-border">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h2 className={SECTION_TITLE}>{t('dashboard.timeActivity.chart.TITLE')}</h2>
				<ChartLegend />
			</div>
			{children}
		</div>
	);
}

/** Drawn by the route skeleton and by the page on its first load: one picture from the route to the data. */
export function TimeActivityFiguresSkeleton({ isManager = true }: Readonly<{ isManager?: boolean }>) {
	const t = useTranslations();
	const items = useMemo(() => {
		const keys = figureKeysOf(isManager);
		return keys.map((key) => labelItemOf(key, t));
	}, [isManager, t]);
	return (
		<DashboardSection ariaLabel={t('dashboard.timeActivity.figures.LABEL')}>
			<MetricStrip items={items} isLoading ariaLabel={t('dashboard.timeActivity.figures.LABEL')} />
			<ChartPart>
				<DayBarsSkeleton heightClassName={CHART_HEIGHT} />
			</ChartPart>
		</DashboardSection>
	);
}

export function TimeActivityFiguresBlock({
	figures,
	chartDays,
	isManager,
	isLoading,
	isDailyPending,
	isDailyError,
	isCountsError,
	onRetryDaily,
	onRetryCounts
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
}>) {
	const t = useTranslations();
	const locale = useWorkspaceLocale();

	const items = useMemo(() => {
		const list: MetricItem<FigureKey>[] = [trackedItemOf(figures, t), activityItemOf(figures, t)];
		if (isManager) {
			list.push(earningsItemOf(figures, locale, t));
		}
		list.push(membersItemOf(figures, t));
		return list;
	}, [figures, isManager, locale, t]);

	const isEmpty = figures.totals.seconds <= 0;
	const showsChart = !isDailyPending && !isDailyError;
	const isWaitingForEverything = isLoading && isDailyPending;
	const isFirstLoad = isWaitingForEverything && !isCountsError;

	if (isFirstLoad) {
		return <TimeActivityFiguresSkeleton isManager={isManager} />;
	}

	return (
		<DashboardSection ariaLabel={t('dashboard.timeActivity.figures.LABEL')}>
			{isCountsError && <DashboardErrorNotice onRetry={onRetryCounts} className="m-3 mb-0" />}
			<MetricStrip items={items} isLoading={isLoading} ariaLabel={t('dashboard.timeActivity.figures.LABEL')} />
			<ChartPart>
				{isDailyPending && <DayBarsSkeleton heightClassName={CHART_HEIGHT} />}
				{isDailyError && <DashboardErrorNotice onRetry={onRetryDaily} />}
				{showsChart && <DayChart days={chartDays} isEmpty={isEmpty} />}
			</ChartPart>
		</DashboardSection>
	);
}
