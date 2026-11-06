'use client';

import { memo, type ReactNode, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { DashboardSection } from '@/core/components/dashboards/kit/dashboard-layout';
import { DayBarsSkeleton } from '@/core/components/dashboards/kit/dashboard-states';
import { DayBarsChart, type DayBarDatum } from '@/core/components/dashboards/kit/day-bars-chart';
import { type MetricItem, MetricStrip } from '@/core/components/dashboards/kit/metric-strip';
import { SECTION_TITLE, SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import type { TrackedShare } from '@/core/hooks/dashboards/manual-time-edits/use-manual-time-edits-report';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort, formatHoursLabel, formatPercent, timeAxisOf } from '@/core/lib/utils/dashboard-figures';
import { type EditsFigures, maxChartSecondsOf } from '@/core/lib/utils/dashboards/manual-time-edits';

type FigureKey = 'manual' | 'added' | 'edited' | 'members' | 'share';

type Translate = ReturnType<typeof useTranslations>;

const MISSING_VALUE = '–';

const CHART_HEIGHT = 'h-36';

function labelsOf(t: Translate): Record<FigureKey, string> {
	return {
		manual: t('dashboard.manualTimeEdits.FIGURE_MANUAL'),
		added: t('dashboard.manualTimeEdits.FIGURE_ADDED'),
		edited: t('dashboard.manualTimeEdits.FIGURE_EDITED'),
		members: t('common.MEMBERS'),
		share: t('dashboard.manualTimeEdits.FIGURE_SHARE')
	};
}

const FIGURE_ORDER: ReadonlyArray<FigureKey> = ['manual', 'added', 'edited', 'members', 'share'];

function emptyItemsOf(t: Translate): MetricItem<FigureKey>[] {
	const labels = labelsOf(t);
	return FIGURE_ORDER.map((key) => ({ key, label: labels[key], value: MISSING_VALUE }));
}

function shareValueOf(share: TrackedShare, locale: string): ReactNode {
	if (share.status === 'loading') {
		return <span aria-hidden="true" className={cn('inline-block h-4 w-12 align-middle', SKELETON_BAR)} />;
	}
	if (share.status === 'ready') {
		return formatPercent(share.percent, locale);
	}
	return MISSING_VALUE;
}

function shareHintOf(share: TrackedShare, t: Translate) {
	if (share.status === 'ready') {
		const tracked = formatDurationShort(share.trackedSeconds);
		return t('dashboard.manualTimeEdits.SHARE_OF_TRACKED', { tracked });
	}
	if (share.status === 'billable-filter') {
		return t('dashboard.manualTimeEdits.SHARE_NO_BILLABLE_SPLIT');
	}
	if (share.status === 'no-time') {
		return t('dashboard.manualTimeEdits.SHARE_NO_TRACKED_TIME');
	}
	if (share.status === 'unavailable') {
		return t('dashboard.manualTimeEdits.SHARE_UNAVAILABLE');
	}
	return undefined;
}

function itemsOf({
	figures,
	share,
	populationCount,
	locale,
	t
}: Readonly<{
	figures: EditsFigures;
	share: TrackedShare;
	populationCount: number;
	locale: string;
	t: Translate;
}>): MetricItem<FigureKey>[] {
	const labels = labelsOf(t);
	return [
		{
			key: 'manual',
			label: labels.manual,
			value: formatDurationShort(figures.manualSeconds),
			hint: t('dashboard.manualTimeEdits.ENTRIES_COUNT', { count: figures.entryCount })
		},
		{
			key: 'added',
			label: labels.added,
			value: formatDurationShort(figures.addedSeconds),
			hint: t('dashboard.manualTimeEdits.ENTRIES_COUNT', { count: figures.addedCount })
		},
		{
			key: 'edited',
			label: labels.edited,
			value: t('dashboard.manualTimeEdits.ENTRIES_COUNT', { count: figures.editedCount }),
			hint: formatDurationShort(figures.editedSeconds)
		},
		{
			key: 'members',
			label: labels.members,
			value: String(figures.memberCount),
			hint: t('dashboard.manualTimeEdits.MEMBERS_OF', { count: populationCount })
		},
		{
			key: 'share',
			label: labels.share,
			value: shareValueOf(share, locale),
			hint: shareHintOf(share, t)
		}
	];
}

function ChartLegend({ hasEdited }: Readonly<{ hasEdited: boolean }>) {
	const t = useTranslations();
	let manualTone = 'bg-primary';
	if (hasEdited) {
		manualTone = 'bg-primary/25';
	}
	return (
		<span className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
			<span className="inline-flex items-center gap-1.5">
				<span className={cn('size-2 rounded-[2px]', manualTone)} />
				{t('dashboard.manualTimeEdits.FIGURE_MANUAL')}
			</span>
			{hasEdited && (
				<span className="inline-flex items-center gap-1.5">
					<span className="size-2 rounded-[2px] bg-primary" />
					{t('dashboard.manualTimeEdits.FIGURE_EDITED')}
				</span>
			)}
		</span>
	);
}

function ChartPart({ hasEdited, children }: Readonly<{ hasEdited: boolean; children: ReactNode }>) {
	const t = useTranslations();
	return (
		<div className="flex flex-col gap-3 px-4 pt-3 pb-4 hairline-t border-border">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h2 className={SECTION_TITLE}>{t('dashboard.manualTimeEdits.CHART_TITLE')}</h2>
				<ChartLegend hasEdited={hasEdited} />
			</div>
			{children}
		</div>
	);
}

const DayChart = memo(function DayChart({
	days,
	isEmpty
}: Readonly<{ days: ReadonlyArray<DayBarDatum>; isEmpty: boolean }>) {
	const t = useTranslations();
	const axis = useMemo(() => {
		const maxSeconds = maxChartSecondsOf(days);
		return timeAxisOf(maxSeconds);
	}, [days]);
	return (
		<div className="relative">
			<DayBarsChart
				data={days}
				axis={axis}
				ariaLabel={t('dashboard.manualTimeEdits.CHART_TITLE')}
				valueLabel={t('dashboard.manualTimeEdits.FIGURE_MANUAL')}
				partLabel={t('dashboard.manualTimeEdits.FIGURE_EDITED')}
				formatValue={formatDurationShort}
				formatTick={formatHoursLabel}
				heightClassName={CHART_HEIGHT}
			/>
			{isEmpty && (
				<div className="pointer-events-none absolute inset-x-0 top-0 flex h-36 items-center justify-center">
					<p className="rounded-full bg-card px-3 py-1 text-xs text-muted-foreground hairline-ring ring-border">
						{t('dashboard.manualTimeEdits.CHART_EMPTY')}
					</p>
				</div>
			)}
		</div>
	);
});

export function ManualTimeEditsFiguresSkeleton() {
	const t = useTranslations();
	const items = useMemo(() => emptyItemsOf(t), [t]);
	const label = t('dashboard.manualTimeEdits.FIGURES_LABEL');
	return (
		<DashboardSection ariaLabel={label}>
			<MetricStrip items={items} isLoading ariaLabel={label} />
			<ChartPart hasEdited={false}>
				<DayBarsSkeleton heightClassName={CHART_HEIGHT} />
			</ChartPart>
		</DashboardSection>
	);
}

export function ManualTimeEditsFigures({
	figures,
	share,
	populationCount,
	chartDays,
	isLoading
}: Readonly<{
	figures: EditsFigures;
	share: TrackedShare;
	populationCount: number;
	chartDays: ReadonlyArray<DayBarDatum>;
	isLoading: boolean;
}>) {
	const t = useTranslations();
	const locale = useLocale();
	const items = useMemo(
		() => itemsOf({ figures, share, populationCount, locale, t }),
		[figures, locale, populationCount, share, t]
	);
	const label = t('dashboard.manualTimeEdits.FIGURES_LABEL');
	const isEmpty = figures.manualSeconds <= 0;
	const hasEdited = figures.editedSeconds > 0;

	if (isLoading) {
		return <ManualTimeEditsFiguresSkeleton />;
	}

	return (
		<DashboardSection ariaLabel={label}>
			<MetricStrip items={items} ariaLabel={label} />
			<ChartPart hasEdited={hasEdited}>
				<DayChart days={chartDays} isEmpty={isEmpty} />
			</ChartPart>
		</DashboardSection>
	);
}
