'use client';

import { type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { DashboardSection } from '@/core/components/dashboards/kit/dashboard-layout';
import { SECTION_TITLE, SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort, formatHoursLabel } from '@/core/lib/utils/dashboard-figures';
import { wholePercentOf, type PlanFigures, type VarianceDay } from '@/core/lib/utils/dashboards/actual-expected';
import { VARIANCE_CHART_HEIGHT, VarianceChart, VarianceChartSkeleton } from './variance-chart';

type Translate = ReturnType<typeof useTranslations>;

const MISSING_FIGURE = '–';

const SEPARATOR = ' · ';

const HEADLINE_VALUE = 'text-2xl font-semibold tabular-nums text-foreground sm:text-[28px] sm:leading-9';

const OVER_CHIP = 'inline-flex rounded-sm bg-primary/10 px-1.5 py-px font-medium tabular-nums text-primary-ink';

const UNDER_CHIP = 'inline-flex rounded-sm bg-warning/10 px-1.5 py-px font-medium tabular-nums text-warning-foreground';

function emphasis(chunks: ReactNode) {
	return <span className="font-medium tabular-nums text-foreground">{chunks}</span>;
}

function overChip(chunks: ReactNode) {
	return <span className={OVER_CHIP}>{chunks}</span>;
}

function underChip(chunks: ReactNode) {
	return <span className={UNDER_CHIP}>{chunks}</span>;
}

function HeadlineFigure({ value, word, meta }: Readonly<{ value: string; word: string; meta?: string }>) {
	return (
		<div className="flex min-w-0 flex-col gap-0.5">
			<p className="flex items-baseline gap-1.5">
				<span className={HEADLINE_VALUE}>{value}</span>
				<span className="text-sm text-muted-foreground">{word}</span>
			</p>
			{meta && <p className="text-xs tabular-nums text-muted-foreground text-pretty">{meta}</p>}
		</div>
	);
}

function plannedValueOf(figures: PlanFigures) {
	if (!figures.totals.hasExpected) {
		return MISSING_FIGURE;
	}
	return formatHoursLabel(figures.totals.expected);
}

function plannedMetaOf(figures: PlanFigures, t: Translate) {
	const { totals, aheadExpected } = figures;
	const hasAhead = aheadExpected > 0;
	const ahead = formatHoursLabel(aheadExpected);
	if (!totals.hasExpected) {
		if (hasAhead) {
			return t('dashboard.actualExpected.EXPECTED_ONLY_AHEAD', { ahead });
		}
		return t('dashboard.actualExpected.EXPECTED_NONE');
	}
	if (hasAhead) {
		return t('dashboard.actualExpected.EXPECTED_FROM_PLANS_AHEAD', { count: totals.plannedDays, ahead });
	}
	return t('dashboard.actualExpected.EXPECTED_FROM_PLANS', { count: totals.plannedDays });
}

/** Silent at zero, as every status line. */
function trackedMetaOf(figures: PlanFigures, t: Translate) {
	const count = figures.totals.unplannedDays;
	if (count <= 0) {
		return undefined;
	}
	return t('dashboard.actualExpected.TRACKED_WITHOUT_PLAN', { count });
}

function ReachParts({ figures }: Readonly<{ figures: PlanFigures }>) {
	const t = useTranslations();
	const { totals } = figures;
	const hasOver = totals.over > 0;
	const hasUnder = totals.under > 0;
	const isOnPlan = !hasOver && !hasUnder;
	const showsShortUnder = hasOver && hasUnder;
	const showsFullUnder = hasUnder && !hasOver;
	return (
		<>
			<span>
				{t.rich('dashboard.actualExpected.REACH_PERCENT', {
					percent: wholePercentOf(totals.share),
					b: emphasis
				})}
			</span>
			{hasOver && (
				<span>
					{SEPARATOR}
					{t.rich('dashboard.actualExpected.REACH_OVER', {
						duration: formatHoursLabel(totals.over),
						count: totals.overDays,
						chip: overChip
					})}
				</span>
			)}
			{showsShortUnder && (
				<span>
					{SEPARATOR}
					{t.rich('dashboard.actualExpected.REACH_UNDER_SHORT', {
						duration: formatHoursLabel(totals.under),
						count: totals.underDays,
						chip: underChip
					})}
				</span>
			)}
			{showsFullUnder && (
				<span>
					{SEPARATOR}
					{t.rich('dashboard.actualExpected.REACH_UNDER', {
						duration: formatHoursLabel(totals.under),
						count: totals.underDays,
						chip: underChip
					})}
				</span>
			)}
			{isOnPlan && (
				<span>
					{SEPARATOR}
					{t('dashboard.actualExpected.REACH_ON_PLAN')}
				</span>
			)}
		</>
	);
}

function ReachSentence({ figures }: Readonly<{ figures: PlanFigures }>) {
	const t = useTranslations();
	const { totals, aheadExpected } = figures;
	const hasActual = totals.actual > 0;
	const hasAhead = aheadExpected > 0;
	const sentenceClass = 'text-[13px] leading-6 text-muted-foreground text-pretty';
	if (totals.hasExpected) {
		return (
			<p className={sentenceClass}>
				<ReachParts figures={figures} />
			</p>
		);
	}
	if (hasAhead) {
		return (
			<p className={sentenceClass}>
				{t.rich('dashboard.actualExpected.CHART_SENTENCE_AHEAD', {
					ahead: formatHoursLabel(aheadExpected),
					b: emphasis
				})}
			</p>
		);
	}
	if (hasActual) {
		return <p className={sentenceClass}>{t('dashboard.actualExpected.NOTHING_TO_COMPARE')}</p>;
	}
	return null;
}

function PlanHeadline({ figures }: Readonly<{ figures: PlanFigures }>) {
	const t = useTranslations();
	const { totals } = figures;
	const hasActual = totals.actual > 0;
	const showsPlanNote = hasActual && !figures.hasAnyPlan;
	return (
		<div className="flex flex-col gap-3 px-4 pt-4 pb-3">
			<div className="flex flex-wrap items-start gap-x-10 gap-y-3">
				<HeadlineFigure
					value={plannedValueOf(figures)}
					word={t('dashboard.actualExpected.HEADLINE_PLANNED')}
					meta={plannedMetaOf(figures, t)}
				/>
				<HeadlineFigure
					value={formatDurationShort(totals.actual)}
					word={t('dashboard.actualExpected.HEADLINE_TRACKED')}
					meta={trackedMetaOf(figures, t)}
				/>
			</div>
			<ReachSentence figures={figures} />
			{showsPlanNote && (
				<p className="text-xs text-muted-foreground text-pretty">{t('dashboard.actualExpected.PLAN_NOTE')}</p>
			)}
		</div>
	);
}

function ChartLegend() {
	const t = useTranslations();
	return (
		<span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground" aria-hidden="true">
			<span className="inline-flex items-center gap-1.5">
				<span className="size-2 rounded-[2px] bg-primary" />
				{t('dashboard.actualExpected.OVER_PLAN')}
			</span>
			<span className="inline-flex items-center gap-1.5">
				<span className="size-2 rounded-[2px] bg-warning" />
				{t('dashboard.actualExpected.UNDER_PLAN')}
			</span>
			<span className="inline-flex items-center gap-1.5">
				<span className="size-2 rounded-full bg-card ring-[1.5px] ring-muted-foreground" />
				{t('dashboard.actualExpected.LEGEND_NO_HOURS')}
			</span>
		</span>
	);
}

function ChartPart({ children }: Readonly<{ children: ReactNode }>) {
	const t = useTranslations();
	return (
		<div className="flex flex-col gap-3 px-4 pt-3 pb-4">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h2 className={SECTION_TITLE}>{t('dashboard.actualExpected.VARIANCE_TITLE')}</h2>
				<ChartLegend />
			</div>
			{children}
		</div>
	);
}

function isNothingToShow(figures: PlanFigures) {
	const hasActual = figures.totals.actual > 0;
	const hasPlanned = figures.totals.hasExpected || figures.aheadExpected > 0;
	return !hasActual && !hasPlanned;
}

function HeadlineSkeleton() {
	return (
		<div aria-hidden="true" className="flex flex-col gap-3 px-4 pt-4 pb-3">
			<div className="flex flex-wrap items-start gap-x-10 gap-y-3">
				<div className="flex flex-col gap-2 py-1.5">
					<span className={cn('h-6 w-28', SKELETON_BAR)} />
					<span className={cn('h-2 w-24', SKELETON_BAR)} />
				</div>
				<div className="flex flex-col gap-2 py-1.5">
					<span className={cn('h-6 w-36', SKELETON_BAR)} />
					<span className={cn('h-2 w-20', SKELETON_BAR)} />
				</div>
			</div>
			<span className={cn('my-1.5 h-2.5 w-full max-w-md', SKELETON_BAR)} />
		</div>
	);
}

export function PlanOverviewSkeleton() {
	const t = useTranslations();
	return (
		<DashboardSection ariaLabel={t('dashboard.actualExpected.FIGURES_LABEL')}>
			<HeadlineSkeleton />
			<ChartPart>
				<VarianceChartSkeleton />
			</ChartPart>
		</DashboardSection>
	);
}

export function PlanOverview({
	figures,
	varianceDays,
	isLoading
}: Readonly<{ figures: PlanFigures | null; varianceDays: ReadonlyArray<VarianceDay>; isLoading: boolean }>) {
	const t = useTranslations();
	if (isLoading) {
		return <PlanOverviewSkeleton />;
	}
	if (!figures) {
		return <PlanOverviewSkeleton />;
	}
	const isEmpty = isNothingToShow(figures);
	return (
		<DashboardSection ariaLabel={t('dashboard.actualExpected.FIGURES_LABEL')}>
			<PlanHeadline figures={figures} />
			<ChartPart>
				<div className="relative">
					<VarianceChart days={varianceDays} ariaLabel={t('dashboard.actualExpected.VARIANCE_TITLE')} />
					{isEmpty && (
						<div
							className={cn(
								'pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center',
								VARIANCE_CHART_HEIGHT
							)}
						>
							<p className="rounded-full bg-card px-3 py-1 text-xs text-muted-foreground hairline-ring ring-border">
								{t('dashboard.actualExpected.CHART_EMPTY')}
							</p>
						</div>
					)}
				</div>
			</ChartPart>
		</DashboardSection>
	);
}
