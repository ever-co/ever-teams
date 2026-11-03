'use client';

import { type ReactNode, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { ActivityMeter } from '@/core/components/dashboards/kit/meters';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { Analytics, Clock, Folder, Users } from '@/core/components/icons';
import type { TeamDashboardState } from '@/core/hooks/dashboards/team/use-team-dashboard';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort, formatPercent, type ShareRow } from '@/core/lib/utils/dashboard-figures';
import type { ProjectShareItem, TeamTotals } from '@/core/lib/utils/dashboards/team';
import type { ITimesheetCountsStatistics } from '@/core/types/interfaces/timesheet/timesheet';
import { DurationValue } from './team-duration-value';

type Translate = ReturnType<typeof useTranslations>;

const MISSING_FIGURE = '–';

const TILES_GRID = 'grid grid-cols-2 gap-3 lg:grid-cols-4';

const TILE = 'surface-raised flex min-w-0 flex-col rounded-xl';

const TILE_FOOTER =
	'mx-1 mb-1 flex min-h-8 min-w-0 items-center justify-between gap-2 rounded-lg bg-foreground/[0.03] px-3 text-xs text-muted-foreground';

const UNIT = 'text-base font-normal text-muted-foreground';

type TileKey = 'tracked' | 'activity' | 'members' | 'projects';

const TILE_KEYS: ReadonlyArray<TileKey> = ['tracked', 'activity', 'members', 'projects'];

const TILE_LABEL_KEYS = {
	tracked: 'dashboard.team.figures.TRACKED',
	activity: 'dashboard.team.figures.ACTIVITY',
	members: 'dashboard.team.figures.MEMBERS',
	projects: 'dashboard.team.figures.PROJECTS'
} as const;

const TILE_ICONS: Record<TileKey, ReactNode> = {
	tracked: <Clock />,
	activity: <Analytics />,
	members: <Users />,
	projects: <Folder />
};

function isFigure(value: number | undefined | null): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

function trackedValueOf(hasReport: boolean, seconds: number): ReactNode {
	if (!hasReport) {
		return MISSING_FIGURE;
	}
	return <DurationValue seconds={seconds} />;
}

function percentValueOf(percent: number | undefined): ReactNode {
	if (!isFigure(percent)) {
		return MISSING_FIGURE;
	}
	const rounded = Math.round(percent);
	return (
		<>
			{rounded}
			<span className={UNIT}>%</span>
		</>
	);
}

function countValueOf(count: number | undefined, numberFormat: Intl.NumberFormat): ReactNode {
	if (!isFigure(count)) {
		return MISSING_FIGURE;
	}
	return numberFormat.format(count);
}

function todayContextOf(value: number | undefined, format: (value: number) => string, t: Translate) {
	if (!isFigure(value)) {
		return null;
	}
	return t('dashboard.team.figures.TODAY', { value: format(value) });
}

/**
 * The tile shows the daily report's total, the time the chart and the roster add up (every log type); the counts
 * hold timer logs only, so their total is named in the footer when it reads differently.
 */
function timerContextOf(counts: ITimesheetCountsStatistics | null, reportSeconds: number, t: Translate) {
	const timerSeconds = counts?.weekDuration;
	if (!isFigure(timerSeconds)) {
		return null;
	}
	const timerText = formatDurationShort(timerSeconds);
	const reportText = formatDurationShort(reportSeconds);
	if (timerText === reportText) {
		return null;
	}
	return t('dashboard.team.pulse.BY_TIMER', { value: timerText });
}

function trackedContextOf(
	counts: ITimesheetCountsStatistics | null,
	hasReport: boolean,
	reportSeconds: number,
	t: Translate
) {
	if (hasReport) {
		const timerContext = timerContextOf(counts, reportSeconds, t);
		if (timerContext) {
			return timerContext;
		}
	}
	return todayContextOf(counts?.todayDuration, formatDurationShort, t);
}

/** "of 6 members" reads only when the scope is known and holds everyone who worked. */
function scopeContextOf(workedCount: number | undefined, scopeMemberCount: number | null, t: Translate) {
	if (scopeMemberCount === null) {
		return null;
	}
	const hasWorkedCount = isFigure(workedCount);
	const isWithinScope = hasWorkedCount && workedCount <= scopeMemberCount;
	if (!isWithinScope) {
		return null;
	}
	return t('dashboard.team.pulse.OF_MEMBERS', { count: scopeMemberCount });
}

/** The time per member divides the tile's tracked total, and says something only when several members share it. */
function perMemberContextOf(hasReport: boolean, totals: TeamTotals, t: Translate) {
	const hasSeveralMembers = totals.memberCount > 1;
	if (!hasReport || !hasSeveralMembers) {
		return null;
	}
	const perMember = formatDurationShort(totals.seconds / totals.memberCount);
	return t('dashboard.team.figures.PER_MEMBER', { value: perMember });
}

function membersContextOf(
	counts: ITimesheetCountsStatistics | null,
	scopeMemberCount: number | null,
	hasReport: boolean,
	totals: TeamTotals,
	t: Translate
) {
	const scopeContext = scopeContextOf(counts?.employeesCount, scopeMemberCount, t);
	if (scopeContext) {
		return scopeContext;
	}
	return perMemberContextOf(hasReport, totals, t);
}

function projectNameOf(item: ProjectShareItem, t: Translate) {
	if (item.isNoProject) {
		return t('dashboard.team.projects.NONE');
	}
	return item.name || t('dashboard.team.projects.NONE');
}

function topProjectOf(shares: ReadonlyArray<ShareRow<ProjectShareItem>>) {
	for (const share of shares) {
		const item = share.item;
		if (!item) {
			continue;
		}
		if (item.isNoProject) {
			continue;
		}
		return item;
	}
	return null;
}

/** Time logged without a project is never named as the project with the most time. */
function projectsContextOf(shares: ReadonlyArray<ShareRow<ProjectShareItem>>, t: Translate) {
	const topProject = topProjectOf(shares);
	if (topProject) {
		return t('dashboard.team.figures.TOP_PROJECT', { name: projectNameOf(topProject, t) });
	}
	const hasTime = shares.length > 0;
	if (!hasTime) {
		return null;
	}
	return t('dashboard.team.pulse.NO_PROJECT_TIME');
}

function activityMeterOf(percent: number | undefined) {
	if (!isFigure(percent)) {
		return null;
	}
	return <ActivityMeter percent={Math.round(percent)} />;
}

interface PulseTileContent {
	key: TileKey;
	value: ReactNode;
	context: string | null;
	trailing?: ReactNode;
	isLoading: boolean;
}

function ValueSkeleton() {
	return <span aria-hidden="true" className={cn('my-2 block h-4 w-20', SKELETON_BAR)} />;
}

function FooterSkeleton() {
	return <span aria-hidden="true" className={cn('h-2 w-24', SKELETON_BAR)} />;
}

/** No delta in the footer: the previous period is not loaded. */
function PulseTile({
	tileKey,
	value,
	context,
	trailing,
	isLoading
}: Readonly<{
	tileKey: TileKey;
	value: ReactNode;
	context: string | null;
	trailing?: ReactNode;
	isLoading: boolean;
}>) {
	const t = useTranslations();
	let shownValue: ReactNode = <span className="text-2xl font-semibold tabular-nums text-foreground">{value}</span>;
	let footer: ReactNode = (
		<>
			<span className="min-w-0 truncate">{context}</span>
			{trailing}
		</>
	);
	if (isLoading) {
		shownValue = <ValueSkeleton />;
		footer = <FooterSkeleton />;
	}
	return (
		<div className={TILE}>
			<div className="flex min-w-0 flex-col gap-1.5 px-4 pt-3.5 pb-3">
				<span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
					<span aria-hidden="true" className="flex shrink-0 [&_svg]:size-3.5">
						{TILE_ICONS[tileKey]}
					</span>
					<span className="truncate">{t(TILE_LABEL_KEYS[tileKey])}</span>
				</span>
				{shownValue}
			</div>
			<div className={TILE_FOOTER}>{footer}</div>
		</div>
	);
}

export function TeamPulseTilesSkeleton() {
	const t = useTranslations();
	return (
		<section aria-label={t('dashboard.team.figures.LABEL')} aria-busy="true" className={TILES_GRID}>
			{TILE_KEYS.map((key) => (
				<PulseTile key={key} tileKey={key} value={null} context={null} isLoading />
			))}
		</section>
	);
}

export function TeamPulseTiles({ dashboard }: Readonly<{ dashboard: TeamDashboardState }>) {
	const t = useTranslations();
	const locale = useLocale();
	const { counts, projectShares, scopeMemberCount, hasReport, totals, isCountsLoading, isReportLoading } = dashboard;
	const numberFormat = useMemo(() => new Intl.NumberFormat(locale), [locale]);

	const tiles = useMemo<PulseTileContent[]>(
		() => [
			{
				key: 'tracked',
				value: trackedValueOf(hasReport, totals.seconds),
				context: trackedContextOf(counts, hasReport, totals.seconds, t),
				isLoading: isReportLoading
			},
			{
				key: 'activity',
				value: percentValueOf(counts?.weekActivities),
				context: todayContextOf(counts?.todayActivities, formatPercent, t),
				trailing: activityMeterOf(counts?.weekActivities),
				isLoading: isCountsLoading
			},
			{
				key: 'members',
				value: countValueOf(counts?.employeesCount, numberFormat),
				context: membersContextOf(counts, scopeMemberCount, hasReport, totals, t),
				isLoading: isCountsLoading
			},
			{
				key: 'projects',
				value: countValueOf(counts?.projectsCount, numberFormat),
				context: projectsContextOf(projectShares, t),
				isLoading: isCountsLoading
			}
		],
		[counts, hasReport, isCountsLoading, isReportLoading, numberFormat, projectShares, scopeMemberCount, t, totals]
	);

	return (
		<div className="flex flex-col gap-3">
			{dashboard.isCountsError && <DashboardErrorNotice onRetry={dashboard.refetchStatistics} />}
			<section
				aria-label={t('dashboard.team.figures.LABEL')}
				aria-busy={dashboard.isRefreshing}
				className={TILES_GRID}
			>
				{tiles.map((tile) => (
					<PulseTile
						key={tile.key}
						tileKey={tile.key}
						value={tile.value}
						context={tile.context}
						trailing={tile.trailing}
						isLoading={tile.isLoading}
					/>
				))}
			</section>
		</div>
	);
}
