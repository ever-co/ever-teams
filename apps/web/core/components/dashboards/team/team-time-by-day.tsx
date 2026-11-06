'use client';

import { useCallback, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { DashboardErrorNotice, DayBarsSkeleton } from '@/core/components/dashboards/kit/dashboard-states';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import type { TeamDashboardState } from '@/core/hooks/dashboards/team/use-team-dashboard';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort, formatHoursLabel, formatPercent, timeAxisOf } from '@/core/lib/utils/dashboard-figures';
import { formatPeriod, periodLengthInDays } from '@/core/lib/utils/dashboard-period';
import { highestStackSecondsOf } from '@/core/lib/utils/dashboards/team';
import { TeamCard } from './team-card';
import { columnDatumOf, emptyChartSentenceOf, GranularityControl } from './team-chart-parts';
import { type ColumnSeries, TeamColumnsChart } from './team-columns-chart';
import { WIDE_SPAN } from './team-grid';
import {
	chartLabelOf,
	effectiveSplitOf,
	focusedKeyOf,
	type LegendEntry,
	legendEntriesOf,
	type PeriodSplit,
	SplitControl,
	stacksOfSplit
} from './team-period';
import { slotFormatsOf } from './team-slot-labels';

const CHART_HEIGHT = 'h-56 lg:h-64';

const CARD_CLASS = WIDE_SPAN;

function DotLegend({
	entries,
	focusedKey,
	onToggle
}: Readonly<{ entries: ReadonlyArray<LegendEntry>; focusedKey: string | null; onToggle: (key: string) => void }>) {
	return (
		<div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
			{entries.map((entry) => {
				const isFocused = entry.key === focusedKey;
				const isFaded = Boolean(focusedKey) && !isFocused;
				return (
					<button
						key={entry.key}
						type="button"
						aria-pressed={isFocused}
						onClick={() => onToggle(entry.key)}
						className={cn(
							'inline-flex max-w-48 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-[3px] focus-visible:ring-ring/25 aria-pressed:bg-foreground/5',
							isFaded && 'text-muted-foreground/70',
							!isFaded && 'text-foreground'
						)}
					>
						<span
							aria-hidden="true"
							className="size-2 shrink-0 rounded-full"
							style={{ backgroundColor: entry.tone }}
						/>
						<span className="truncate">{entry.name}</span>
						<span className="shrink-0 tabular-nums text-muted-foreground">
							{formatDurationShort(entry.seconds)}
						</span>
					</button>
				);
			})}
		</div>
	);
}

export function TeamTimeByDaySkeleton() {
	const t = useTranslations();
	return (
		<TeamCard
			title={t('dashboard.team.cards.TIME_BY_DAY')}
			className={CARD_CLASS}
			bodyClassName="flex flex-col gap-3"
		>
			<DayBarsSkeleton heightClassName={CHART_HEIGHT} />
			<span aria-hidden="true" className={cn('h-2.5 w-48', SKELETON_BAR)} />
		</TeamCard>
	);
}

export function TeamTimeByDay({ dashboard }: Readonly<{ dashboard: TeamDashboardState }>) {
	const t = useTranslations();
	const locale = useLocale();
	const [pickedSplit, setPickedSplit] = useState<PeriodSplit>('member');
	const [pickedKey, setPickedKey] = useState<string | null>(null);
	const { granularity, chartPeriod, limitSeconds, rows, hasFilters, hasProjectSplit, memberSeries, series } =
		dashboard;
	const split = effectiveSplitOf(pickedSplit, hasProjectSplit);
	const formats = useMemo(() => slotFormatsOf(locale), [locale]);
	const periodDays = periodLengthInDays(chartPeriod);
	const stacks = stacksOfSplit(dashboard, split);

	const entries = useMemo(() => legendEntriesOf(memberSeries, series, split, t), [memberSeries, series, split, t]);
	const focusedKey = focusedKeyOf(pickedKey, entries);
	const chartSeries = useMemo<ColumnSeries[]>(
		() => entries.map((entry) => ({ key: entry.key, name: entry.name, tone: entry.tone })),
		[entries]
	);
	const data = useMemo(
		() => stacks.map((stack) => columnDatumOf(stack, granularity, formats, periodDays, t)),
		[formats, granularity, periodDays, stacks, t]
	);

	const togglePick = useCallback(
		(key: string) => {
			setPickedKey((current) => {
				const isCurrentFocus = focusedKeyOf(current, entries) === key;
				if (isCurrentFocus) {
					return null;
				}
				return key;
			});
		},
		[entries]
	);
	const formatMembers = useCallback((count: number) => t('dashboard.team.table.MEMBER_COUNT', { count }), [t]);
	const formatActivity = useCallback(
		(percent: number) => {
			const value = formatPercent(percent);
			return t('dashboard.team.columns.ACTIVITY', { value });
		},
		[t]
	);

	if (dashboard.isReportLoading) {
		return <TeamTimeByDaySkeleton />;
	}

	const title = t('dashboard.team.cards.TIME_BY_DAY');
	const meta = formatPeriod(chartPeriod, locale);
	const control = (
		<>
			<SplitControl
				split={split}
				hasProjectSplit={hasProjectSplit}
				onSplitChange={setPickedSplit}
				memberLabel={t('common.MEMBERS')}
				projectLabel={t('dashboard.team.table.PROJECTS')}
			/>
			<GranularityControl dashboard={dashboard} />
		</>
	);

	if (dashboard.isReportError) {
		return (
			<TeamCard title={title} meta={meta} control={control} className={CARD_CLASS}>
				<DashboardErrorNotice onRetry={dashboard.refetchReport} />
			</TeamCard>
		);
	}

	const highestSeconds = highestStackSecondsOf(stacks);
	const axisCeiling = Math.max(highestSeconds, limitSeconds ?? 0);
	const axis = timeAxisOf(axisCeiling);
	const isEmpty = rows.length === 0;
	const hasLimit = typeof limitSeconds === 'number';
	let limitLabel: string | undefined;
	if (hasLimit) {
		const standardDay = formatHoursLabel(limitSeconds);
		limitLabel = t('dashboard.team.chart.STANDARD_DAY', { value: standardDay });
	}

	return (
		<TeamCard
			title={title}
			meta={meta}
			control={control}
			isBusy={dashboard.isRefreshing}
			className={CARD_CLASS}
			bodyClassName="flex flex-col gap-2"
		>
			<div className="relative">
				<TeamColumnsChart
					data={data}
					series={chartSeries}
					axis={axis}
					focusedKey={focusedKey}
					ariaLabel={chartLabelOf(split, t)}
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
					<div
						className={cn(
							'pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center pl-11',
							CHART_HEIGHT
						)}
					>
						<p className="rounded-md bg-card px-3 py-1.5 text-center text-[13px] text-muted-foreground text-balance">
							{emptyChartSentenceOf(hasFilters, t)}
						</p>
					</div>
				)}
			</div>
			<DotLegend entries={entries} focusedKey={focusedKey} onToggle={togglePick} />
		</TeamCard>
	);
}
