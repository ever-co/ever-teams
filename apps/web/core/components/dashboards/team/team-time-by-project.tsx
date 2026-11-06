'use client';

import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { DashboardSection } from '@/core/components/dashboards/kit/dashboard-layout';
import { DashboardErrorNotice, DayBarsSkeleton } from '@/core/components/dashboards/kit/dashboard-states';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import type { TeamDashboardState } from '@/core/hooks/dashboards/team/use-team-dashboard';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort, formatHoursLabel, formatPercent, timeAxisOf } from '@/core/lib/utils/dashboard-figures';
import { periodLengthInDays } from '@/core/lib/utils/dashboard-period';
import { highestStackSecondsOf, type ProjectSeries } from '@/core/lib/utils/dashboards/team';
import { CHART_HEIGHT, columnDatumOf, emptyChartSentenceOf, GranularityControl, peakTextOf } from './team-chart-parts';
import { type ColumnSeries, TeamColumnsChart } from './team-columns-chart';
import { seriesNameOf, seriesTonesOf, toneOfKey } from './team-series-tone';
import { slotFormatsOf } from './team-slot-labels';

const BODY_GRID = 'grid lg:grid-cols-[minmax(0,1fr)_17rem]';

const LEGEND_FRAME = 'flex min-w-0 flex-col border-border py-2 max-lg:hairline-t lg:hairline-l';

const LEGEND_ROW = 'grid min-h-9 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 text-[13px]';

/** A legend pick that is no longer a series of the period (new period, new filters) falls back to no pick. */
function focusedKeyOf(pickedKey: string | null, series: ReadonlyArray<ProjectSeries>) {
	if (!pickedKey) {
		return null;
	}
	const isStillShown = series.some((entry) => entry.key === pickedKey);
	if (!isStillShown) {
		return null;
	}
	return pickedKey;
}

function legendRowClassOf(isFaded: boolean) {
	if (isFaded) {
		return 'text-muted-foreground';
	}
	return 'text-foreground';
}

function ProjectLegend({
	series,
	tones,
	totalSeconds,
	focusedKey,
	onToggle
}: Readonly<{
	series: ReadonlyArray<ProjectSeries>;
	tones: ReadonlyMap<string, string>;
	totalSeconds: number;
	focusedKey: string | null;
	onToggle: (key: string) => void;
}>) {
	const t = useTranslations();
	if (series.length === 0) {
		return (
			<div className={LEGEND_FRAME}>
				<p className="px-4 py-2 text-xs text-muted-foreground text-pretty">
					{t('dashboard.team.projects.EMPTY')}
				</p>
			</div>
		);
	}
	return (
		<div role="group" aria-label={t('dashboard.team.columns.LEGEND')} className={LEGEND_FRAME}>
			{series.map((entry) => {
				const isFocused = entry.key === focusedKey;
				const isFaded = Boolean(focusedKey) && !isFocused;
				const tone = toneOfKey(tones, entry.key);
				return (
					<button
						key={entry.key}
						type="button"
						aria-pressed={isFocused}
						onClick={() => onToggle(entry.key)}
						className={cn(
							LEGEND_ROW,
							'text-left outline-none transition-colors hover:bg-foreground/5 focus-visible:bg-foreground/5 aria-pressed:bg-foreground/[0.04]',
							legendRowClassOf(isFaded)
						)}
					>
						<span className="flex min-w-0 items-center gap-2">
							<span
								aria-hidden="true"
								className="size-2 shrink-0 rounded-full"
								style={{ backgroundColor: tone }}
							/>
							<span className="truncate">{seriesNameOf(entry, t)}</span>
						</span>
						<span className="font-medium tabular-nums">{formatDurationShort(entry.seconds)}</span>
					</button>
				);
			})}
			<span aria-hidden="true" className="mx-4 my-1 hairline-t border-border" />
			<div className={LEGEND_ROW}>
				<span className="text-muted-foreground">{t('dashboard.team.export.TOTAL')}</span>
				<span className="font-semibold tabular-nums text-foreground">{formatDurationShort(totalSeconds)}</span>
			</div>
		</div>
	);
}

const LEGEND_SKELETON_WIDTHS = ['w-24', 'w-20', 'w-28', 'w-16'];

function ProjectLegendSkeleton() {
	return (
		<div aria-hidden="true" className={LEGEND_FRAME}>
			{LEGEND_SKELETON_WIDTHS.map((width) => (
				<div key={width} className={LEGEND_ROW}>
					<span className="flex items-center gap-2">
						<span className="size-2 shrink-0 animate-pulse rounded-full bg-foreground/[0.08]" />
						<span className={cn('h-2.5', width, SKELETON_BAR)} />
					</span>
					<span className={cn('h-2.5 w-10', SKELETON_BAR)} />
				</div>
			))}
			<span className="mx-4 my-1 hairline-t border-border" />
			<div className={LEGEND_ROW}>
				<span className={cn('h-2.5 w-10', SKELETON_BAR)} />
				<span className={cn('h-2.5 w-12', SKELETON_BAR)} />
			</div>
		</div>
	);
}

function TimeByProjectFrame({
	meta,
	actions,
	isBusy = false,
	children
}: Readonly<{ meta?: string | null; actions?: ReactNode; isBusy?: boolean; children: ReactNode }>) {
	const t = useTranslations();
	const title = t('dashboard.team.columns.TITLE');
	return (
		<DashboardSection title={title} meta={meta} actions={actions} ariaLabel={title}>
			<div className={BODY_GRID} aria-busy={isBusy}>
				{children}
			</div>
		</DashboardSection>
	);
}

export function TeamTimeByProjectSkeleton() {
	return (
		<TimeByProjectFrame>
			<div className="min-w-0 px-4 pt-3 pb-4">
				<DayBarsSkeleton heightClassName={CHART_HEIGHT} />
			</div>
			<ProjectLegendSkeleton />
		</TimeByProjectFrame>
	);
}

export function TeamTimeByProject({ dashboard }: Readonly<{ dashboard: TeamDashboardState }>) {
	const t = useTranslations();
	const locale = useLocale();
	const { columnStacks, series, granularity, chartPeriod, limitSeconds, rows, totals, hasFilters } = dashboard;
	const [pickedKey, setPickedKey] = useState<string | null>(null);
	const formats = useMemo(() => slotFormatsOf(locale), [locale]);
	const periodDays = periodLengthInDays(chartPeriod);
	const tones = useMemo(() => seriesTonesOf(series), [series]);
	const focusedKey = focusedKeyOf(pickedKey, series);

	const data = useMemo(
		() => columnStacks.map((stack) => columnDatumOf(stack, granularity, formats, periodDays, t)),
		[columnStacks, formats, granularity, periodDays, t]
	);

	const chartSeries = useMemo<ColumnSeries[]>(
		() =>
			series.map((entry) => ({
				key: entry.key,
				name: seriesNameOf(entry, t),
				tone: toneOfKey(tones, entry.key)
			})),
		[series, t, tones]
	);

	const togglePick = useCallback(
		(key: string) => {
			setPickedKey((current) => {
				const isCurrentFocus = focusedKeyOf(current, series) === key;
				if (isCurrentFocus) {
					return null;
				}
				return key;
			});
		},
		[series]
	);

	const formatMembers = useCallback((count: number) => t('dashboard.team.table.MEMBER_COUNT', { count }), [t]);
	const formatActivity = useCallback(
		(percent: number) => {
			const value = formatPercent(percent);
			return t('dashboard.team.columns.ACTIVITY', { value });
		},
		[t]
	);

	const highestSeconds = highestStackSecondsOf(columnStacks);
	const axisCeiling = Math.max(highestSeconds, limitSeconds ?? 0);
	const axis = timeAxisOf(axisCeiling);
	const isEmpty = rows.length === 0;
	const hasLimit = typeof limitSeconds === 'number';
	let limitLabel: string | undefined;
	if (hasLimit) {
		const standardDay = formatHoursLabel(limitSeconds);
		limitLabel = t('dashboard.team.chart.STANDARD_DAY', { value: standardDay });
	}

	if (dashboard.isReportLoading) {
		return <TeamTimeByProjectSkeleton />;
	}

	const actions = <GranularityControl dashboard={dashboard} />;

	if (dashboard.isReportError) {
		return (
			<TimeByProjectFrame actions={actions}>
				<div className="lg:col-span-2">
					<DashboardErrorNotice onRetry={dashboard.refetchReport} className="m-3" />
				</div>
			</TimeByProjectFrame>
		);
	}

	return (
		<TimeByProjectFrame meta={peakTextOf(data, t)} actions={actions} isBusy={dashboard.isRefreshing}>
			<div className="relative min-w-0 px-4 pt-3 pb-4">
				<TeamColumnsChart
					data={data}
					series={chartSeries}
					axis={axis}
					focusedKey={focusedKey}
					ariaLabel={t('dashboard.team.columns.LABEL')}
					totalLabel={t('dashboard.team.export.TOTAL')}
					emptySlotLabel={t('dashboard.team.columns.NO_TIME')}
					formatValue={formatDurationShort}
					formatTick={formatHoursLabel}
					formatMembers={formatMembers}
					formatActivity={formatActivity}
					limit={limitSeconds}
					limitLabel={limitLabel}
					heightClassName={CHART_HEIGHT}
				/>
				{isEmpty && (
					<div className="pointer-events-none absolute inset-x-4 top-3 flex h-56 items-center justify-center pl-11">
						<p className="rounded-md bg-card px-3 py-1.5 text-center text-[13px] text-muted-foreground text-balance">
							{emptyChartSentenceOf(hasFilters, t)}
						</p>
					</div>
				)}
			</div>
			<ProjectLegend
				series={series}
				tones={tones}
				totalSeconds={totals.seconds}
				focusedKey={focusedKey}
				onToggle={togglePick}
			/>
		</TimeByProjectFrame>
	);
}
