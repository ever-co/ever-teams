'use client';

import { memo, type ReactNode, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { DashboardSection } from '@/core/components/dashboards/kit/dashboard-layout';
import { DayBarsSkeleton } from '@/core/components/dashboards/kit/dashboard-states';
import { DayBarsChart, type DayBarDatum } from '@/core/components/dashboards/kit/day-bars-chart';
import { type MetricItem, MetricStrip, type MetricTone } from '@/core/components/dashboards/kit/metric-strip';
import { SECTION_TITLE } from '@/core/components/dashboards/kit/recipes';
import { formatDurationShort, formatHoursLabel, timeAxisOf } from '@/core/lib/utils/dashboard-figures';
import { wholePercentOf, type PlanFigures } from '@/core/lib/utils/dashboards/actual-expected';

type FigureKey = 'expected' | 'actual' | 'over' | 'under' | 'withoutPlan';

type Translate = ReturnType<typeof useTranslations>;

const MISSING_FIGURE = '–';

const CHART_HEIGHT = 'h-44';

function labelsOf(t: Translate): Record<FigureKey, string> {
	return {
		expected: t('dashboard.actualExpected.EXPECTED'),
		actual: t('dashboard.actualExpected.ACTUAL'),
		over: t('dashboard.actualExpected.OVER_PLAN'),
		under: t('dashboard.actualExpected.UNDER_PLAN'),
		withoutPlan: t('dashboard.actualExpected.WITHOUT_PLAN')
	};
}

function placeholderItemsOf(t: Translate): MetricItem<FigureKey>[] {
	const labels = labelsOf(t);
	return [
		{ key: 'expected', label: labels.expected, value: MISSING_FIGURE },
		{ key: 'actual', label: labels.actual, value: MISSING_FIGURE },
		{ key: 'over', label: labels.over, value: MISSING_FIGURE },
		{ key: 'under', label: labels.under, value: MISSING_FIGURE },
		{ key: 'withoutPlan', label: labels.withoutPlan, value: MISSING_FIGURE }
	];
}

function expectedHintOf(figures: PlanFigures, t: Translate) {
	const { totals, aheadExpected } = figures;
	const hasAhead = aheadExpected > 0;
	if (!totals.hasExpected) {
		if (hasAhead) {
			return t('dashboard.actualExpected.EXPECTED_ONLY_AHEAD', { ahead: formatHoursLabel(aheadExpected) });
		}
		return t('dashboard.actualExpected.EXPECTED_NONE');
	}
	if (hasAhead) {
		return t('dashboard.actualExpected.EXPECTED_FROM_PLANS_AHEAD', {
			count: totals.plannedDays,
			ahead: formatHoursLabel(aheadExpected)
		});
	}
	return t('dashboard.actualExpected.EXPECTED_FROM_PLANS', { count: totals.plannedDays });
}

function expectedValueOf(figures: PlanFigures) {
	if (!figures.totals.hasExpected) {
		return MISSING_FIGURE;
	}
	return formatHoursLabel(figures.totals.expected);
}

function actualHintOf(figures: PlanFigures, t: Translate) {
	const { totals } = figures;
	if (!totals.hasExpected) {
		return t('dashboard.actualExpected.NOTHING_TO_COMPARE');
	}
	const percent = wholePercentOf(totals.share);
	return t('dashboard.actualExpected.ACTUAL_OF_EXPECTED', { percent });
}

function overValueOf(figures: PlanFigures, t: Translate) {
	const { totals } = figures;
	if (!totals.hasExpected) {
		return MISSING_FIGURE;
	}
	if (totals.over <= 0) {
		return formatHoursLabel(0);
	}
	return t('dashboard.actualExpected.DIFFERENCE_OVER', { duration: formatHoursLabel(totals.over) });
}

function underValueOf(figures: PlanFigures) {
	const { totals } = figures;
	if (!totals.hasExpected) {
		return MISSING_FIGURE;
	}
	return formatHoursLabel(totals.under);
}

function memberDaysHintOf(figures: PlanFigures, count: number, t: Translate) {
	if (!figures.totals.hasExpected) {
		return t('dashboard.actualExpected.NOTHING_TO_COMPARE');
	}
	return t('dashboard.actualExpected.ON_MEMBER_DAYS', { count });
}

function underToneOf(figures: PlanFigures): MetricTone {
	if (figures.totals.under > 0) {
		return 'warning';
	}
	return 'default';
}

function figureItemsOf(figures: PlanFigures, t: Translate): MetricItem<FigureKey>[] {
	const labels = labelsOf(t);
	const { totals } = figures;
	return [
		{
			key: 'expected',
			label: labels.expected,
			value: expectedValueOf(figures),
			hint: expectedHintOf(figures, t)
		},
		{
			key: 'actual',
			label: labels.actual,
			value: formatDurationShort(totals.actual),
			hint: actualHintOf(figures, t)
		},
		{
			key: 'over',
			label: labels.over,
			value: overValueOf(figures, t),
			hint: memberDaysHintOf(figures, totals.overDays, t)
		},
		{
			key: 'under',
			label: labels.under,
			value: underValueOf(figures),
			hint: memberDaysHintOf(figures, totals.underDays, t),
			tone: underToneOf(figures)
		},
		{
			key: 'withoutPlan',
			label: labels.withoutPlan,
			value: String(totals.unplannedDays),
			hint: t('dashboard.actualExpected.WITHOUT_PLAN_HINT', { count: totals.unplannedDays })
		}
	];
}

function ChartLegend() {
	const t = useTranslations();
	return (
		<span className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
			<span className="inline-flex items-center gap-1.5">
				<span className="size-2 rounded-[2px] bg-primary" />
				{t('dashboard.actualExpected.ACTUAL')}
			</span>
			<span className="inline-flex items-center gap-1.5">
				<span className="h-0.5 w-2.5 rounded-full bg-foreground/55" />
				{t('dashboard.actualExpected.EXPECTED')}
			</span>
		</span>
	);
}

function emphasis(chunks: ReactNode) {
	return <span className="font-medium text-foreground">{chunks}</span>;
}

function ChartSentence({ figures }: Readonly<{ figures: PlanFigures }>) {
	const t = useTranslations();
	const { totals, aheadExpected } = figures;
	const hasActual = totals.actual > 0;
	const hasAhead = aheadExpected > 0;
	if (totals.hasExpected) {
		return (
			<p className="text-[13px] text-muted-foreground text-pretty">
				{t.rich('dashboard.actualExpected.CHART_SENTENCE', {
					actual: formatDurationShort(totals.actual),
					expected: formatHoursLabel(totals.expected),
					percent: wholePercentOf(totals.share),
					b: emphasis
				})}
			</p>
		);
	}
	if (hasActual) {
		return (
			<p className="text-[13px] text-muted-foreground text-pretty">
				{t.rich('dashboard.actualExpected.CHART_SENTENCE_UNPLANNED', {
					actual: formatDurationShort(totals.actual),
					b: emphasis
				})}
			</p>
		);
	}
	if (hasAhead) {
		return (
			<p className="text-[13px] text-muted-foreground text-pretty">
				{t.rich('dashboard.actualExpected.CHART_SENTENCE_AHEAD', {
					ahead: formatHoursLabel(aheadExpected),
					b: emphasis
				})}
			</p>
		);
	}
	return null;
}

function maxSecondsOf(days: ReadonlyArray<DayBarDatum>) {
	let maxSeconds = 0;
	for (const day of days) {
		const target = day.target ?? 0;
		const dayMax = Math.max(day.value, target);
		maxSeconds = Math.max(maxSeconds, dayMax);
	}
	return maxSeconds;
}

const PlanChart = memo(function PlanChart({ days, isEmpty }: Readonly<{ days: DayBarDatum[]; isEmpty: boolean }>) {
	const t = useTranslations();
	const axis = useMemo(() => timeAxisOf(maxSecondsOf(days)), [days]);
	return (
		<div className="relative">
			<DayBarsChart
				data={days}
				axis={axis}
				ariaLabel={t('dashboard.actualExpected.CHART_TITLE')}
				valueLabel={t('dashboard.actualExpected.ACTUAL')}
				targetLabel={t('dashboard.actualExpected.EXPECTED')}
				formatValue={formatDurationShort}
				formatTick={formatHoursLabel}
				heightClassName={CHART_HEIGHT}
			/>
			{isEmpty && (
				<div className="pointer-events-none absolute inset-x-0 top-0 flex h-44 items-center justify-center">
					<p className="rounded-full bg-card px-3 py-1 text-xs text-muted-foreground hairline-ring ring-border">
						{t('dashboard.actualExpected.CHART_EMPTY')}
					</p>
				</div>
			)}
		</div>
	);
});

function ChartPart({ sentence, children }: Readonly<{ sentence?: ReactNode; children: ReactNode }>) {
	const t = useTranslations();
	return (
		<div className="flex flex-col gap-3 px-4 pt-3 pb-4 hairline-t border-border">
			{sentence}
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h2 className={SECTION_TITLE}>{t('dashboard.actualExpected.CHART_TITLE')}</h2>
				<ChartLegend />
			</div>
			{children}
		</div>
	);
}

export function ActualExpectedFiguresSkeleton() {
	const t = useTranslations();
	const items = useMemo(() => placeholderItemsOf(t), [t]);
	const label = t('dashboard.actualExpected.FIGURES_LABEL');
	return (
		<DashboardSection ariaLabel={label}>
			<MetricStrip items={items} isLoading ariaLabel={label} />
			<ChartPart>
				<DayBarsSkeleton heightClassName={CHART_HEIGHT} />
			</ChartPart>
		</DashboardSection>
	);
}

export function ActualExpectedFigures({
	figures,
	chartDays,
	isLoading
}: Readonly<{ figures: PlanFigures | null; chartDays: DayBarDatum[]; isLoading: boolean }>) {
	const t = useTranslations();
	const items = useMemo(() => {
		if (!figures) {
			return placeholderItemsOf(t);
		}
		return figureItemsOf(figures, t);
	}, [figures, t]);
	const label = t('dashboard.actualExpected.FIGURES_LABEL');

	if (isLoading) {
		return <ActualExpectedFiguresSkeleton />;
	}
	if (!figures) {
		return <ActualExpectedFiguresSkeleton />;
	}

	const { totals } = figures;
	const hasActual = totals.actual > 0;
	const hasPlanned = totals.hasExpected || figures.aheadExpected > 0;
	const isEmpty = !hasActual && !hasPlanned;
	const showsPlanNote = hasActual && !figures.hasAnyPlan;

	return (
		<DashboardSection ariaLabel={label}>
			<MetricStrip items={items} ariaLabel={label} />
			{showsPlanNote && (
				<p className="px-4 py-2 text-xs text-muted-foreground hairline-t border-dashed border-border">
					{t('dashboard.actualExpected.PLAN_NOTE')}
				</p>
			)}
			<ChartPart sentence={<ChartSentence figures={figures} />}>
				<PlanChart days={chartDays} isEmpty={isEmpty} />
			</ChartPart>
		</DashboardSection>
	);
}
