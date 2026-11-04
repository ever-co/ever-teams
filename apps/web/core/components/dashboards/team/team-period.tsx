'use client';

import {
	type ButtonHTMLAttributes,
	cloneElement,
	type ReactElement,
	type ReactNode,
	useCallback,
	useMemo,
	useState
} from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { SegmentedControl, type SegmentedControlItem } from '@/core/components/common/segmented-control';
import { DashboardSection } from '@/core/components/dashboards/kit/dashboard-layout';
import { DashboardErrorNotice, DayBarsSkeleton } from '@/core/components/dashboards/kit/dashboard-states';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { Tooltip } from '@/core/components/duplicated-components/tooltip';
import type { TeamDashboardState } from '@/core/hooks/dashboards/team/use-team-dashboard';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort, formatHoursLabel, formatPercent, timeAxisOf } from '@/core/lib/utils/dashboard-figures';
import { formatPeriod, periodLengthInDays } from '@/core/lib/utils/dashboard-period';
import { highestStackSecondsOf } from '@/core/lib/utils/dashboards/team';
import { CHART_HEIGHT, columnDatumOf, emptyChartSentenceOf, GranularityControl, peakTextOf } from './team-chart-parts';
import { type ColumnSeries, TeamColumnsChart } from './team-columns-chart';
import { memberSeriesNameOf, memberSeriesToneOf, seriesNameOf, seriesTonesOf, toneOfKey } from './team-series-tone';
import { slotFormatsOf } from './team-slot-labels';

type Translate = ReturnType<typeof useTranslations>;

export type PeriodSplit = 'member' | 'project';

const BODY_GRID = 'grid lg:grid-cols-[minmax(0,1fr)_18rem]';

const LEGEND_FRAME = 'flex min-w-0 flex-col border-border py-2 max-lg:hairline-t lg:hairline-l';

const LEGEND_ROW = 'grid min-h-9 grid-cols-[minmax(0,1fr)_auto_2.75rem] items-center gap-3 px-4 text-[13px]';

const BLOCKED_SEGMENT = 'inline-flex [&>button]:cursor-not-allowed [&>button]:opacity-50';

export interface LegendEntry {
	key: string;
	name: string;
	tone: string;
	seconds: number;
	share: number;
}

export function effectiveSplitOf(picked: PeriodSplit, hasProjectSplit: boolean): PeriodSplit {
	if (hasProjectSplit) {
		return picked;
	}
	return 'member';
}

export function legendEntriesOf(
	memberSeries: TeamDashboardState['memberSeries'],
	projectSeries: TeamDashboardState['series'],
	split: PeriodSplit,
	t: Translate
): LegendEntry[] {
	if (split === 'member') {
		return memberSeries.map((entry) => ({
			key: entry.key,
			name: memberSeriesNameOf(entry, t),
			tone: memberSeriesToneOf(entry),
			seconds: entry.seconds,
			share: entry.share
		}));
	}
	const tones = seriesTonesOf(projectSeries);
	return projectSeries.map((entry) => ({
		key: entry.key,
		name: seriesNameOf(entry, t),
		tone: toneOfKey(tones, entry.key),
		seconds: entry.seconds,
		share: entry.share
	}));
}

export function stacksOfSplit(dashboard: TeamDashboardState, split: PeriodSplit) {
	if (split === 'member') {
		return dashboard.memberColumnStacks;
	}
	return dashboard.columnStacks;
}

/** A legend pick that is no longer a series (another split, period or filter) falls back to no pick. */
export function focusedKeyOf(pickedKey: string | null, entries: ReadonlyArray<LegendEntry>) {
	if (!pickedKey) {
		return null;
	}
	const isStillShown = entries.some((entry) => entry.key === pickedKey);
	if (!isStillShown) {
		return null;
	}
	return pickedKey;
}

function membersTrackedOf(dashboard: TeamDashboardState, t: Translate) {
	const count = dashboard.totals.memberCount;
	const scopeCount = dashboard.scopeMemberCount;
	const hasScope = scopeCount !== null;
	const isWithinScope = hasScope && count <= (scopeCount ?? 0);
	if (isWithinScope) {
		return t('dashboard.team.period.MEMBERS_OF', { count, total: scopeCount ?? 0 });
	}
	return t('dashboard.team.period.MEMBERS', { count });
}

function periodSummaryOf(dashboard: TeamDashboardState, t: Translate) {
	const { totals } = dashboard;
	if (dashboard.rows.length === 0) {
		return null;
	}
	const total = formatDurationShort(totals.seconds);
	const parts = [t('dashboard.team.period.SUMMARY', { total, days: totals.dayCount })];
	parts.push(membersTrackedOf(dashboard, t));
	if (totals.activity > 0) {
		const activity = formatPercent(totals.activity);
		parts.push(t('dashboard.team.columns.ACTIVITY', { value: activity }));
	}
	return parts.join(' · ');
}

function disabledSegmentOf(button: ReactElement) {
	const segment = button as ReactElement<ButtonHTMLAttributes<HTMLButtonElement>>;
	return cloneElement(segment, { disabled: true, 'aria-disabled': true });
}

export function SplitControl({
	split,
	hasProjectSplit,
	onSplitChange,
	memberLabel,
	projectLabel
}: Readonly<{
	split: PeriodSplit;
	hasProjectSplit: boolean;
	onSplitChange: (split: PeriodSplit) => void;
	memberLabel?: string;
	projectLabel?: string;
}>) {
	const t = useTranslations();
	const items: SegmentedControlItem<PeriodSplit>[] = [
		{ value: 'member', label: memberLabel ?? t('dashboard.team.table.BY_MEMBER') },
		{ value: 'project', label: projectLabel ?? t('dashboard.team.period.BY_PROJECT') }
	];
	const pickSplit = (next: PeriodSplit) => {
		const isBlocked = next === 'project' && !hasProjectSplit;
		if (isBlocked) {
			return;
		}
		onSplitChange(next);
	};
	const renderItem = (item: SegmentedControlItem<PeriodSplit>, button: ReactElement) => {
		const isBlocked = item.value === 'project' && !hasProjectSplit;
		if (!isBlocked) {
			return button;
		}
		return (
			<Tooltip label={t('dashboard.team.period.NO_PROJECT_REASON')} placement="top">
				<span className={BLOCKED_SEGMENT}>{disabledSegmentOf(button)}</span>
			</Tooltip>
		);
	};
	return (
		<SegmentedControl
			items={items}
			value={split}
			onValueChange={pickSplit}
			ariaLabel={t('dashboard.team.period.SPLIT')}
			renderItem={renderItem}
		/>
	);
}

function PeriodLegend({
	entries,
	totalSeconds,
	focusedKey,
	ariaLabel,
	onToggle
}: Readonly<{
	entries: ReadonlyArray<LegendEntry>;
	totalSeconds: number;
	focusedKey: string | null;
	ariaLabel: string;
	onToggle: (key: string) => void;
}>) {
	const t = useTranslations();
	if (entries.length === 0) {
		return (
			<div className={LEGEND_FRAME}>
				<p className="px-4 py-2 text-xs text-muted-foreground text-pretty">
					{t('dashboard.team.period.LEGEND_EMPTY')}
				</p>
			</div>
		);
	}
	return (
		<div role="group" aria-label={ariaLabel} className={LEGEND_FRAME}>
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
							LEGEND_ROW,
							'text-left outline-none transition-colors hover:bg-foreground/5 focus-visible:bg-foreground/5 aria-pressed:bg-foreground/[0.04]',
							isFaded && 'text-muted-foreground',
							!isFaded && 'text-foreground'
						)}
					>
						<span className="flex min-w-0 items-center gap-2">
							<span
								aria-hidden="true"
								className="size-2 shrink-0 rounded-full"
								style={{ backgroundColor: entry.tone }}
							/>
							<span className="truncate">{entry.name}</span>
						</span>
						<span className="font-medium tabular-nums">{formatDurationShort(entry.seconds)}</span>
						<span className="text-right text-xs tabular-nums text-muted-foreground">
							{formatPercent(entry.share)}
						</span>
					</button>
				);
			})}
			<span aria-hidden="true" className="mx-4 my-1 hairline-t border-border" />
			<div className={LEGEND_ROW}>
				<span className="text-muted-foreground">{t('dashboard.team.export.TOTAL')}</span>
				<span className="font-semibold tabular-nums text-foreground">{formatDurationShort(totalSeconds)}</span>
				<span />
			</div>
		</div>
	);
}

const LEGEND_SKELETON_WIDTHS = ['w-24', 'w-20', 'w-28', 'w-16'];

function PeriodLegendSkeleton() {
	return (
		<div aria-hidden="true" className={LEGEND_FRAME}>
			{LEGEND_SKELETON_WIDTHS.map((width) => (
				<div key={width} className={LEGEND_ROW}>
					<span className="flex items-center gap-2">
						<span className="size-2 shrink-0 animate-pulse rounded-full bg-foreground/[0.08]" />
						<span className={cn('h-2.5', width, SKELETON_BAR)} />
					</span>
					<span className={cn('h-2.5 w-10', SKELETON_BAR)} />
					<span className={cn('ml-auto h-2 w-6', SKELETON_BAR)} />
				</div>
			))}
		</div>
	);
}

function PeriodFrame({
	title,
	meta,
	actions,
	isBusy = false,
	children
}: Readonly<{ title: string; meta?: string | null; actions?: ReactNode; isBusy?: boolean; children: ReactNode }>) {
	return (
		<DashboardSection title={title} meta={meta} actions={actions} ariaLabel={title}>
			<div className={BODY_GRID} aria-busy={isBusy}>
				{children}
			</div>
		</DashboardSection>
	);
}

export function TeamPeriodSkeleton() {
	const t = useTranslations();
	return (
		<PeriodFrame title={t('dashboard.team.period.TITLE')}>
			<div className="min-w-0 px-4 pt-3 pb-4">
				<DayBarsSkeleton heightClassName={CHART_HEIGHT} />
			</div>
			<PeriodLegendSkeleton />
		</PeriodFrame>
	);
}

export function chartLabelOf(split: PeriodSplit, t: Translate) {
	if (split === 'member') {
		return t('dashboard.team.period.LABEL_MEMBER');
	}
	return t('dashboard.team.columns.LABEL');
}

function legendLabelOf(split: PeriodSplit, t: Translate) {
	if (split === 'member') {
		return t('dashboard.team.period.LEGEND_MEMBERS');
	}
	return t('dashboard.team.columns.LEGEND');
}

export function TeamPeriod({ dashboard }: Readonly<{ dashboard: TeamDashboardState }>) {
	const t = useTranslations();
	const locale = useLocale();
	const [pickedSplit, setPickedSplit] = useState<PeriodSplit>('member');
	const [pickedKey, setPickedKey] = useState<string | null>(null);
	const { granularity, chartPeriod, limitSeconds, rows, totals, hasFilters, hasProjectSplit, memberSeries, series } =
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
		return <TeamPeriodSkeleton />;
	}

	const title = formatPeriod(chartPeriod, locale);
	const actions = (
		<div className="flex flex-wrap items-center gap-2">
			<SplitControl split={split} hasProjectSplit={hasProjectSplit} onSplitChange={setPickedSplit} />
			<GranularityControl dashboard={dashboard} />
		</div>
	);

	if (dashboard.isReportError) {
		return (
			<PeriodFrame title={title} actions={actions}>
				<div className="lg:col-span-2">
					<DashboardErrorNotice onRetry={dashboard.refetchReport} className="m-3" />
				</div>
			</PeriodFrame>
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
	const peakText = peakTextOf(data, t);
	const summary = periodSummaryOf(dashboard, t);
	const metaParts = [summary, peakText].filter(Boolean);
	const meta = metaParts.join(' · ');

	return (
		<PeriodFrame title={title} meta={meta} actions={actions} isBusy={dashboard.isRefreshing}>
			<div className="relative min-w-0 px-4 pt-3 pb-4">
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
					<div className="pointer-events-none absolute inset-x-4 top-3 flex h-56 items-center justify-center pl-11">
						<p className="rounded-md bg-card px-3 py-1.5 text-center text-[13px] text-muted-foreground text-balance">
							{emptyChartSentenceOf(hasFilters, t)}
						</p>
					</div>
				)}
			</div>
			<PeriodLegend
				entries={entries}
				totalSeconds={totals.seconds}
				focusedKey={focusedKey}
				ariaLabel={legendLabelOf(split, t)}
				onToggle={togglePick}
			/>
		</PeriodFrame>
	);
}
