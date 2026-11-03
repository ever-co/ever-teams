'use client';

import { type CSSProperties, memo, useCallback, useMemo } from 'react';
import { subDays } from 'date-fns';
import { type DottedLanguageObjectStringPaths, useLocale, useTranslations } from 'next-intl';
import { AnimatedHeight } from '@/core/components/common/animated-height';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';
import { Button } from '@/core/components/duplicated-components/_button';
import { ChevronRight, Task } from '@/core/components/icons';
import { DashboardSection, ReportHeaderRow, ReportTotalsRow } from '@/core/components/dashboards/kit/dashboard-layout';
import { BlockEmptyMessage, DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { ActivityFigure, ShareMeter } from '@/core/components/dashboards/kit/meters';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import {
	useBreakdownOpenState,
	useTimeActivityBreakdown
} from '@/core/hooks/dashboards/time-activity/use-time-activity-breakdown';
import { cn } from '@/core/lib/helpers';
import { formatPercent } from '@/core/lib/utils/dashboard-figures';
import { formatPeriod, type Period } from '@/core/lib/utils/dashboard-period';
import { activityPercentOf, type DailyReportRow } from '@/core/lib/utils/daily-report-figures';
import {
	BREAKDOWN_PATHS,
	type BreakdownDimension,
	type BreakdownGrouping,
	type BreakdownNode,
	type BreakdownSubject,
	type BreakdownTotals,
	type TimeActivityColumn,
	dateOfKey,
	offersProjectsColumn,
	todayKeyOf
} from '@/core/lib/utils/dashboards/time-activity';
import {
	DurationText,
	EarningsText,
	FIGURE_TEXT,
	PersonGlyph,
	ProjectGlyph,
	ProjectsCell,
	projectNameOf
} from './time-activity-cells';

const TITLE_KEYS: Record<BreakdownGrouping, DottedLanguageObjectStringPaths> = {
	date: 'dashboard.timeActivity.table.TITLE_DATE',
	member: 'dashboard.timeActivity.table.TITLE_MEMBER',
	project: 'dashboard.timeActivity.table.TITLE_PROJECT',
	task: 'dashboard.timeActivity.table.TITLE_TASK'
};

const DIMENSION_LABEL_KEYS: Record<BreakdownDimension, DottedLanguageObjectStringPaths> = {
	day: 'dashboard.timeActivity.grouping.DATE',
	member: 'dashboard.timeActivity.grouping.MEMBER',
	project: 'dashboard.timeActivity.grouping.PROJECT',
	task: 'dashboard.timeActivity.grouping.TASK'
};

export interface BreakdownColumns {
	projects: boolean;
	tracked: boolean;
	earnings: boolean;
	activity: boolean;
}

export function breakdownColumnsOf(
	grouping: BreakdownGrouping,
	hiddenColumns: ReadonlyArray<TimeActivityColumn>,
	isManager: boolean
): BreakdownColumns {
	const isProjectsHidden = hiddenColumns.includes('project');
	const showsProjects = offersProjectsColumn(grouping) && !isProjectsHidden;
	const isEarningsHidden = hiddenColumns.includes('earnings');
	const showsEarnings = isManager && !isEarningsHidden;
	return {
		projects: showsProjects,
		tracked: !hiddenColumns.includes('tracked'),
		earnings: showsEarnings,
		activity: !hiddenColumns.includes('activity')
	};
}

const TRACKS = {
	rank: '1.25rem',
	rankWide: '2rem',
	name: 'minmax(0,1fr)',
	projects: 'minmax(6rem,10rem)',
	meter: 'minmax(3rem,7rem)',
	share: '2.5rem',
	shareWide: '3rem',
	tracked: '4.5rem',
	trackedWide: '5.25rem',
	earnings: 'minmax(6rem,9rem)',
	activity: '6.75rem'
};

/** On a phone a row keeps its rank, its name with the share meter under it, the share and the time. */
function phoneTracksOf(columns: BreakdownColumns) {
	const tracks = [TRACKS.rank, TRACKS.name, TRACKS.share];
	if (columns.tracked) {
		tracks.push(TRACKS.tracked);
	}
	return tracks.join(' ');
}

interface WideTracks {
	withEarnings: boolean;
	withProjects: boolean;
}

function wideTracksOf(columns: BreakdownColumns, wide: WideTracks) {
	const tracks = [TRACKS.rankWide, TRACKS.name];
	const addsProjects = wide.withProjects && columns.projects;
	if (addsProjects) {
		tracks.push(TRACKS.projects);
	}
	tracks.push(TRACKS.meter, TRACKS.shareWide);
	if (columns.tracked) {
		tracks.push(TRACKS.trackedWide);
	}
	const addsEarnings = wide.withEarnings && columns.earnings;
	if (addsEarnings) {
		tracks.push(TRACKS.earnings);
	}
	if (columns.activity) {
		tracks.push(TRACKS.activity);
	}
	return tracks.join(' ');
}

/** The grid follows the shown columns and the breakpoint, so its templates travel as CSS variables. */
function gridStyleOf(columns: BreakdownColumns): CSSProperties {
	return {
		'--ta-rank-grid': phoneTracksOf(columns),
		'--ta-rank-grid-sm': wideTracksOf(columns, { withEarnings: false, withProjects: false }),
		'--ta-rank-grid-lg': wideTracksOf(columns, { withEarnings: true, withProjects: false }),
		'--ta-rank-grid-xl': wideTracksOf(columns, { withEarnings: true, withProjects: true })
	} as CSSProperties;
}

const BREAKDOWN_GRID =
	'grid grid-cols-(--ta-rank-grid) items-center gap-x-2 px-4 sm:grid-cols-(--ta-rank-grid-sm) sm:gap-x-3 lg:grid-cols-(--ta-rank-grid-lg) xl:grid-cols-(--ta-rank-grid-xl)';

const RANK_CELL = 'flex justify-center';
const PROJECTS_CELL = 'min-w-0 max-xl:hidden';
const METER_CELL = 'max-sm:hidden';
const SHARE_CELL = 'text-right';
const TRACKED_CELL = 'text-right';
const EARNINGS_CELL = 'min-w-0 text-right max-lg:hidden';
const ACTIVITY_CELL = 'flex justify-end max-sm:hidden';

const RANK_CAP =
	'keycap-3d inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] px-1 text-[11px] font-medium tabular-nums text-muted-foreground';

const COUNT_PILL =
	'inline-flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-[5px] bg-foreground/[0.06] px-1 text-[11px] font-medium tabular-nums text-muted-foreground';

const SUBJECT_TOGGLE =
	'-ms-1 flex min-w-0 items-center gap-2 rounded-md py-0.5 ps-1 pe-1.5 text-start outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-[3px] focus-visible:ring-ring/25';

/** Each level sits 20px further in; its guide runs down the middle of the parent's 16px chevron. */
const INDENT = 20;
const GUIDE_OFFSET = 8;
const GUIDE_GAP = 2;

const VERTICAL_GUIDE = 'absolute top-0 w-(--hairline) bg-border';
const HORIZONTAL_GUIDE = 'absolute top-1/2 h-(--hairline) bg-border';

const EMPTY_LINEAGE: ReadonlyArray<boolean> = [];

interface BreakdownText {
	locale: string;
	todayKey: string;
	yesterdayKey: string;
	today: string;
	yesterday: string;
	dayFormat: Intl.DateTimeFormat;
	monthDay: Intl.DateTimeFormat;
	unnamed: string;
	noProject: string;
	noTask: string;
	noRate: string;
	noTime: string;
	noActivity: string;
	noTaskActivity: string;
	moreProjects: (count: number) => string;
	countOf: (dimension: BreakdownDimension, count: number) => string;
}

interface RowContext {
	path: ReadonlyArray<BreakdownDimension>;
	columns: BreakdownColumns;
	text: BreakdownText;
	openKeys: ReadonlySet<string>;
	onToggle: (key: string) => void;
}

type Translate = ReturnType<typeof useTranslations>;

function countLabelOf(dimension: BreakdownDimension, count: number, t: Translate) {
	if (dimension === 'day') {
		return t('dashboard.timeActivity.table.DAYS', { count });
	}
	if (dimension === 'member') {
		return t('dashboard.timeActivity.table.MEMBERS', { count });
	}
	if (dimension === 'project') {
		return t('dashboard.timeActivity.table.PROJECTS', { count });
	}
	return t('dashboard.timeActivity.breakdown.TASKS', { count });
}

function useBreakdownText(): BreakdownText {
	const t = useTranslations();
	const locale = useLocale();
	return useMemo(() => {
		const now = new Date();
		const yesterday = subDays(now, 1);
		return {
			locale,
			todayKey: todayKeyOf(now),
			yesterdayKey: todayKeyOf(yesterday),
			today: t('common.TODAY'),
			yesterday: t('common.YESTERDAY'),
			dayFormat: new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }),
			monthDay: new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }),
			unnamed: t('timeActivity.UNNAMED_EMPLOYEE'),
			noProject: t('common.NO_PROJECT'),
			noTask: t('dashboard.timeActivity.export.NO_TASK'),
			noRate: t('dashboard.timeActivity.table.NO_RATE'),
			noTime: t('dashboard.timeActivity.figures.NO_TIME'),
			noActivity: t('dashboard.timeActivity.table.NO_ACTIVITY'),
			noTaskActivity: t('dashboard.timeActivity.breakdown.TASK_ACTIVITY'),
			moreProjects: (count: number) => t('dashboard.timeActivity.table.MORE_PROJECTS', { count }),
			countOf: (dimension: BreakdownDimension, count: number) => countLabelOf(dimension, count, t)
		};
	}, [locale, t]);
}

function relativeDayOf(dateKey: string, text: BreakdownText) {
	if (dateKey === text.todayKey) {
		return text.today;
	}
	if (dateKey === text.yesterdayKey) {
		return text.yesterday;
	}
	return null;
}

function dayPartClassOf(part: Intl.DateTimeFormatPart) {
	if (part.type === 'weekday') {
		return 'font-semibold';
	}
	return undefined;
}

/** "Mon, Nov 3" with the weekday in semibold, or "Today" and "Yesterday" with the date beside them. */
function DayLabel({ dateKey, text }: Readonly<{ dateKey: string; text: BreakdownText }>) {
	const date = dateOfKey(dateKey);
	const relativeDay = relativeDayOf(dateKey, text);
	if (relativeDay !== null) {
		return (
			<span className="flex min-w-0 items-baseline gap-1.5">
				<span className="truncate font-semibold">{relativeDay}</span>
				<span className="shrink-0 text-xs font-normal text-muted-foreground">{text.monthDay.format(date)}</span>
			</span>
		);
	}
	const parts = text.dayFormat.formatToParts(date);
	return (
		<span className="truncate">
			{parts.map((part, index) => (
				<span key={index} className={dayPartClassOf(part)}>
					{part.value}
				</span>
			))}
		</span>
	);
}

function TaskLabel({ title, text }: Readonly<{ title: string | null; text: BreakdownText }>) {
	const hasTitle = title !== null;
	const label = title ?? text.noTask;
	return (
		<span className="flex min-w-0 items-center gap-2" title={label}>
			<Task aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
			<span className={cn('truncate', !hasTitle && 'text-muted-foreground')}>{label}</span>
		</span>
	);
}

function SubjectLabel({ subject, text }: Readonly<{ subject: BreakdownSubject; text: BreakdownText }>) {
	if (subject.kind === 'day') {
		return <DayLabel dateKey={subject.dateKey} text={text} />;
	}
	if (subject.kind === 'member') {
		const name = subject.name || text.unnamed;
		return (
			<span className="flex min-w-0 items-center gap-2">
				<PersonGlyph name={name} imageUrl={subject.imageUrl} />
				<span className="truncate">{name}</span>
			</span>
		);
	}
	if (subject.kind === 'project') {
		const hasProject = subject.project.name !== null;
		return (
			<span className="flex min-w-0 items-center gap-2">
				<ProjectGlyph project={subject.project} />
				<span className={cn('truncate', !hasProject && 'text-muted-foreground')}>
					{projectNameOf(subject.project, text.noProject)}
				</span>
			</span>
		);
	}
	return <TaskLabel title={subject.title} text={text} />;
}

function verticalGuideClassOf(isLast: boolean) {
	if (isLast) {
		return cn(VERTICAL_GUIDE, 'bottom-1/2');
	}
	return cn(VERTICAL_GUIDE, 'bottom-0');
}

function guideStartOf(level: number) {
	return level * INDENT + GUIDE_OFFSET;
}

/** The indent guide: the lines of the ancestors that continue below, then this row's elbow from its parent. */
function TreeGuides({
	depth,
	lineage,
	isLast
}: Readonly<{ depth: number; lineage: ReadonlyArray<boolean>; isLast: boolean }>) {
	if (depth === 0) {
		return null;
	}
	const ownStart = guideStartOf(depth - 1);
	const elbowWidth = INDENT - GUIDE_OFFSET - GUIDE_GAP;
	return (
		<span aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-0">
			{lineage.map((continues, level) => {
				if (!continues) {
					return null;
				}
				return (
					<span
						key={level}
						className={cn(VERTICAL_GUIDE, 'bottom-0')}
						style={{ insetInlineStart: guideStartOf(level) }}
					/>
				);
			})}
			<span className={verticalGuideClassOf(isLast)} style={{ insetInlineStart: ownStart }} />
			<span className={HORIZONTAL_GUIDE} style={{ insetInlineStart: ownStart, width: elbowWidth }} />
		</span>
	);
}

function CountPill({ label, count }: Readonly<{ label: string; count: number }>) {
	return (
		<span className={COUNT_PILL} title={label}>
			<span aria-hidden="true">{count}</span>
			<span className="sr-only">{label}</span>
		</span>
	);
}

function nameToneOf(isTop: boolean) {
	if (isTop) {
		return 'font-medium text-foreground';
	}
	return 'text-foreground';
}

function SubjectCell({
	node,
	isOpen,
	context
}: Readonly<{ node: BreakdownNode; isOpen: boolean; context: RowContext }>) {
	const { text } = context;
	const hasChildren = node.children.length > 0;
	const isTop = node.depth === 0;
	const labelClass = cn('min-w-0 text-[13px]', nameToneOf(isTop));
	const handleToggle = useCallback(() => context.onToggle(node.key), [context, node.key]);
	if (!hasChildren) {
		return (
			<span className={cn('flex items-center gap-2 py-0.5', labelClass)}>
				<span aria-hidden="true" className="size-4 shrink-0" />
				<SubjectLabel subject={node.subject} text={text} />
			</span>
		);
	}
	return (
		<button type="button" aria-expanded={isOpen} onClick={handleToggle} className={cn(SUBJECT_TOGGLE, labelClass)}>
			<ChevronRight
				aria-hidden="true"
				className={cn(
					'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
					isOpen && 'rotate-90'
				)}
			/>
			<SubjectLabel subject={node.subject} text={text} />
		</button>
	);
}

function childDimensionOf(context: RowContext, depth: number) {
	const childDepth = depth + 1;
	return context.path[childDepth] ?? null;
}

function ChildCount({ node, context }: Readonly<{ node: BreakdownNode; context: RowContext }>) {
	const dimension = childDimensionOf(context, node.depth);
	const count = node.children.length;
	if (!dimension) {
		return null;
	}
	if (count === 0) {
		return null;
	}
	const label = context.text.countOf(dimension, count);
	return <CountPill label={label} count={count} />;
}

interface ActivityFigures {
	seconds: number;
	activeSeconds: number;
	hasExactActivity: boolean;
}

function missingActivityReasonOf(figures: ActivityFigures, text: BreakdownText) {
	if (!figures.hasExactActivity) {
		return text.noTaskActivity;
	}
	const hasTime = figures.seconds > 0;
	if (!hasTime) {
		return text.noTime;
	}
	const hasActivity = figures.activeSeconds > 0;
	if (!hasActivity) {
		return text.noActivity;
	}
	return null;
}

/** "–" says why there is no percentage: a task level, no time, or a timer that records no activity. */
function ActivityCell({ figures, text }: Readonly<{ figures: ActivityFigures; text: BreakdownText }>) {
	const reason = missingActivityReasonOf(figures, text);
	if (reason !== null) {
		return (
			<span className={cn(FIGURE_TEXT, 'text-muted-foreground')} title={reason}>
				<span aria-hidden="true">–</span>
				<span className="sr-only">{reason}</span>
			</span>
		);
	}
	return <ActivityFigure percent={activityPercentOf(figures)} />;
}

function shareToneOf(isTop: boolean) {
	if (isTop) {
		return 'text-foreground';
	}
	return 'text-muted-foreground';
}

function durationToneOf(isTop: boolean) {
	if (isTop) {
		return 'font-medium';
	}
	return 'text-muted-foreground';
}

function rowHeightOf(isTop: boolean) {
	if (isTop) {
		return 'min-h-11';
	}
	return 'min-h-9';
}

function BreakdownRow({
	node,
	rank,
	lineage,
	isLast,
	isOpen,
	context
}: Readonly<{
	node: BreakdownNode;
	rank: number | null;
	lineage: ReadonlyArray<boolean>;
	isLast: boolean;
	isOpen: boolean;
	context: RowContext;
}>) {
	const { columns, text } = context;
	const isTop = node.depth === 0;
	const hasRank = rank !== null;
	return (
		<div role="row" className={cn(BREAKDOWN_GRID, rowHeightOf(isTop))}>
			<span role="cell" className={RANK_CELL}>
				{hasRank && <span className={RANK_CAP}>{rank}</span>}
			</span>
			<span
				role="rowheader"
				className="relative flex min-w-0 self-stretch"
				style={{ paddingInlineStart: node.depth * INDENT }}
			>
				<TreeGuides depth={node.depth} lineage={lineage} isLast={isLast} />
				<span className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-1">
					<span className="flex min-w-0 items-center gap-1.5">
						<SubjectCell node={node} isOpen={isOpen} context={context} />
						<ChildCount node={node} context={context} />
					</span>
					<span className="block ps-6 sm:hidden">
						<ShareMeter share={node.share} />
					</span>
				</span>
			</span>
			{columns.projects && (
				<span role="cell" className={PROJECTS_CELL}>
					<ProjectsCell
						projects={node.projects}
						noProjectLabel={text.noProject}
						moreLabel={text.moreProjects}
					/>
				</span>
			)}
			<span aria-hidden="true" className={METER_CELL}>
				<ShareMeter share={node.share} />
			</span>
			<span role="cell" className={cn(SHARE_CELL, FIGURE_TEXT, shareToneOf(isTop))}>
				{formatPercent(node.share, text.locale)}
			</span>
			{columns.tracked && (
				<span role="cell" className={TRACKED_CELL}>
					<DurationText seconds={node.seconds} className={durationToneOf(isTop)} />
				</span>
			)}
			{columns.earnings && (
				<span role="cell" className={EARNINGS_CELL}>
					<EarningsText amounts={node.earnings} locale={text.locale} noRateLabel={text.noRate} />
				</span>
			)}
			{columns.activity && (
				<span role="cell" className={ACTIVITY_CELL}>
					<ActivityCell figures={node} text={text} />
				</span>
			)}
		</div>
	);
}

/** The children of a top row draw no line of their own; deeper rows carry their parent's on. */
function childLineageOf(node: BreakdownNode, lineage: ReadonlyArray<boolean>, isLast: boolean) {
	if (node.depth === 0) {
		return EMPTY_LINEAGE;
	}
	return [...lineage, !isLast];
}

function isLastIndex(index: number, count: number) {
	return index === count - 1;
}

const BreakdownBranch = memo(function BreakdownBranch({
	node,
	rank,
	lineage,
	isLast,
	context
}: Readonly<{
	node: BreakdownNode;
	rank: number | null;
	lineage: ReadonlyArray<boolean>;
	isLast: boolean;
	context: RowContext;
}>) {
	const hasChildren = node.children.length > 0;
	const isOpen = context.openKeys.has(node.key);
	const showsChildren = hasChildren && isOpen;
	const childLineage = useMemo(() => childLineageOf(node, lineage, isLast), [isLast, lineage, node]);
	const childCount = node.children.length;
	return (
		<>
			<BreakdownRow node={node} rank={rank} lineage={lineage} isLast={isLast} isOpen={isOpen} context={context} />
			{hasChildren && (
				<AnimatedHeight>
					{showsChildren && (
						<div className="hairline-t border-border pb-1">
							{node.children.map((child, index) => (
								<BreakdownBranch
									key={child.key}
									node={child}
									rank={null}
									lineage={childLineage}
									isLast={isLastIndex(index, childCount)}
									context={context}
								/>
							))}
						</div>
					)}
				</AnimatedHeight>
			)}
		</>
	);
});

function PathStep({ label, isFirst }: Readonly<{ label: string; isFirst: boolean }>) {
	return (
		<>
			{!isFirst && <ChevronRight aria-hidden="true" className="size-3 shrink-0 text-muted-foreground/70" />}
			<span className="truncate">{label}</span>
		</>
	);
}

function ShareHeader() {
	const t = useTranslations();
	return (
		<Tooltip>
			<TooltipTrigger
				delay={400}
				render={
					<button
						type="button"
						className="-mx-1 rounded-sm px-1 text-right outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25"
					/>
				}
			>
				{t('dashboard.timeActivity.columns.SHARE')}
			</TooltipTrigger>
			<TooltipContent className="max-w-72">{t('dashboard.timeActivity.breakdown.SHARE_HINT')}</TooltipContent>
		</Tooltip>
	);
}

function HeaderCells({
	path,
	columns
}: Readonly<{ path: ReadonlyArray<BreakdownDimension>; columns: BreakdownColumns }>) {
	const t = useTranslations();
	return (
		<>
			<span role="columnheader">
				<span className="sr-only">{t('dashboard.timeActivity.breakdown.RANK')}</span>
			</span>
			<span role="columnheader" className="flex min-w-0 items-center gap-1">
				{path.map((dimension, index) => (
					<PathStep key={dimension} label={t(DIMENSION_LABEL_KEYS[dimension])} isFirst={index === 0} />
				))}
			</span>
			{columns.projects && (
				<span role="columnheader" className={PROJECTS_CELL}>
					{t('dashboard.timeActivity.columns.PROJECTS')}
				</span>
			)}
			<span aria-hidden="true" className={METER_CELL} />
			<span role="columnheader" className={SHARE_CELL}>
				<ShareHeader />
			</span>
			{columns.tracked && (
				<span role="columnheader" className={TRACKED_CELL}>
					{t('dashboard.timeActivity.columns.TRACKED')}
				</span>
			)}
			{columns.earnings && (
				<span role="columnheader" className={EARNINGS_CELL}>
					{t('dashboard.timeActivity.columns.EARNINGS')}
				</span>
			)}
			{columns.activity && (
				<span role="columnheader" className={ACTIVITY_CELL}>
					{t('dashboard.timeActivity.columns.ACTIVITY')}
				</span>
			)}
		</>
	);
}

function TotalsCells({
	totals,
	topDimension,
	topCount,
	projectCount,
	columns,
	text
}: Readonly<{
	totals: BreakdownTotals;
	topDimension: BreakdownDimension;
	topCount: number;
	projectCount: number;
	columns: BreakdownColumns;
	text: BreakdownText;
}>) {
	const t = useTranslations();
	const activityFigures = useMemo<ActivityFigures>(() => ({ ...totals, hasExactActivity: true }), [totals]);
	return (
		<>
			<span role="cell" />
			<span role="rowheader" className="flex min-w-0 items-baseline gap-2">
				<span>{t('common.TOTAL')}</span>
				<span className="truncate text-xs font-normal tabular-nums text-muted-foreground">
					{text.countOf(topDimension, topCount)}
				</span>
			</span>
			{columns.projects && (
				<span role="cell" className={cn(PROJECTS_CELL, FIGURE_TEXT, 'font-normal text-muted-foreground')}>
					{text.countOf('project', projectCount)}
				</span>
			)}
			<span aria-hidden="true" className={METER_CELL} />
			<span role="cell" className={SHARE_CELL} />
			{columns.tracked && (
				<span role="cell" className={TRACKED_CELL}>
					<DurationText seconds={totals.seconds} />
				</span>
			)}
			{columns.earnings && (
				<span role="cell" className={EARNINGS_CELL}>
					<EarningsText amounts={totals.earnings} locale={text.locale} noRateLabel={text.noRate} />
				</span>
			)}
			{columns.activity && (
				<span role="cell" className={ACTIVITY_CELL}>
					<ActivityCell figures={activityFigures} text={text} />
				</span>
			)}
		</>
	);
}

function BreakdownEmpty({
	period,
	hasFilters,
	onClearFilters,
	onPreviousPeriod
}: Readonly<{ period: Period; hasFilters: boolean; onClearFilters: () => void; onPreviousPeriod: () => void }>) {
	const t = useTranslations();
	const locale = useLocale();
	const periodText = formatPeriod(period, locale);
	if (hasFilters) {
		return (
			<BlockEmptyMessage
				title={t('dashboard.timeActivity.empty.FILTERED_TITLE', { period: periodText })}
				message={t('dashboard.timeActivity.empty.FILTERED_MESSAGE')}
				action={
					<Button type="button" variant="outline" size="default" onClick={onClearFilters}>
						{t('common.CLEAR_FILTERS')}
					</Button>
				}
			/>
		);
	}
	return (
		<BlockEmptyMessage
			title={t('dashboard.timeActivity.empty.TITLE', { period: periodText })}
			message={t('dashboard.timeActivity.empty.MESSAGE')}
			action={
				<Button type="button" variant="outline" size="default" onClick={onPreviousPeriod}>
					{t('dashboard.period.PREVIOUS')}
				</Button>
			}
		/>
	);
}

const SKELETON_ROW_COUNT = 6;

function SkeletonRow({ index, columns }: Readonly<{ index: number; columns: BreakdownColumns }>) {
	const nameShare = Math.max(35, 75 - index * 8);
	const meterShare = Math.max(15, 85 - index * 14);
	const nameWidth = `${nameShare}%`;
	const meterWidth = `${meterShare}%`;
	return (
		<div className={cn(BREAKDOWN_GRID, 'min-h-11')}>
			<span className={RANK_CELL}>
				<span className="size-5 animate-pulse rounded-[5px] bg-foreground/[0.05]" />
			</span>
			<span className="flex min-w-0 items-center gap-2 ps-6">
				<span className="size-4 shrink-0 animate-pulse rounded-full bg-foreground/[0.06]" />
				<span className={cn('h-2.5', SKELETON_BAR)} style={{ width: nameWidth }} />
			</span>
			{columns.projects && <span className={cn(PROJECTS_CELL, 'h-2.5 w-20', SKELETON_BAR)} />}
			<span className={METER_CELL}>
				<span className="block h-1 w-full rounded-full bg-foreground/[0.05]">
					<span
						className="block h-full animate-pulse rounded-full bg-foreground/[0.07]"
						style={{ width: meterWidth }}
					/>
				</span>
			</span>
			<span className={cn('ml-auto h-2.5 w-7', SKELETON_BAR)} />
			{columns.tracked && <span className={cn('ml-auto h-2.5 w-12', SKELETON_BAR)} />}
			{columns.earnings && <span className={cn(EARNINGS_CELL, 'ml-auto h-2.5 w-14', SKELETON_BAR)} />}
			{columns.activity && <span className={cn(ACTIVITY_CELL, 'ml-auto h-2.5 w-16', SKELETON_BAR)} />}
		</div>
	);
}

function BreakdownRowsSkeleton({ columns }: Readonly<{ columns: BreakdownColumns }>) {
	return (
		<div className="hairline-divide-y divide-border" aria-hidden="true">
			{Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
				<SkeletonRow key={index} index={index} columns={columns} />
			))}
		</div>
	);
}

/** Drawn by the route skeleton and by the page while the report loads: one picture from the route to the rows. */
export function TimeActivityBreakdownSkeleton({
	grouping,
	columns
}: Readonly<{ grouping: BreakdownGrouping; columns: BreakdownColumns }>) {
	const t = useTranslations();
	const title = t(TITLE_KEYS[grouping]);
	const gridStyle = useMemo(() => gridStyleOf(columns), [columns]);
	return (
		<DashboardSection title={title} ariaLabel={title}>
			<div role="table" aria-label={title} aria-busy="true" style={gridStyle}>
				<ReportHeaderRow gridClassName={BREAKDOWN_GRID}>
					<HeaderCells path={BREAKDOWN_PATHS[grouping]} columns={columns} />
				</ReportHeaderRow>
				<BreakdownRowsSkeleton columns={columns} />
			</div>
		</DashboardSection>
	);
}

function toggleAllLabelOf(isAnyOpen: boolean, t: Translate) {
	if (isAnyOpen) {
		return t('dashboard.timeActivity.table.COLLAPSE_ALL');
	}
	return t('dashboard.timeActivity.table.EXPAND_ALL');
}

function distinctProjectCountOf(nodes: ReadonlyArray<BreakdownNode>) {
	const keys = new Set<string>();
	for (const node of nodes) {
		for (const project of node.projects) {
			keys.add(project.key);
		}
	}
	return keys.size;
}

function hasOpenableRows(nodes: ReadonlyArray<BreakdownNode>) {
	return nodes.some((node) => node.children.length > 0);
}

interface TimeActivityBreakdownProps {
	grouping: BreakdownGrouping;
	rows: ReadonlyArray<DailyReportRow>;
	columns: BreakdownColumns;
	period: Period;
	isLoading: boolean;
	isError: boolean;
	hasFilters: boolean;
	onRetry: () => void;
	onClearFilters: () => void;
	onPreviousPeriod: () => void;
}

/** Every top row sits in its own `content-visibility` block, so a long period paints only what is on screen. */
export function TimeActivityBreakdown({
	grouping,
	rows,
	columns,
	period,
	isLoading,
	isError,
	hasFilters,
	onRetry,
	onClearFilters,
	onPreviousPeriod
}: Readonly<TimeActivityBreakdownProps>) {
	const t = useTranslations();
	const text = useBreakdownText();
	const tree = useTimeActivityBreakdown(rows, grouping);
	const { openKeys, isAnyOpen, toggle, toggleAll } = useBreakdownOpenState(tree.nodes);
	const path = BREAKDOWN_PATHS[grouping];
	const gridStyle = useMemo(() => gridStyleOf(columns), [columns]);
	const context = useMemo<RowContext>(
		() => ({ path, columns, text, openKeys, onToggle: toggle }),
		[columns, openKeys, path, text, toggle]
	);
	const projectCount = useMemo(() => distinctProjectCountOf(tree.nodes), [tree.nodes]);

	const title = t(TITLE_KEYS[grouping]);
	const topCount = tree.nodes.length;
	const hasRows = topCount > 0;
	const showsRows = hasRows && !isLoading;
	const isSettled = !isLoading && !isError;
	const showsEmpty = !hasRows && isSettled;
	const showsError = isError && !isLoading;
	const showsHeader = !showsEmpty && !showsError;
	const hasOpenable = hasOpenableRows(tree.nodes);
	const showsToggleAll = showsRows && hasOpenable;

	if (isLoading) {
		return <TimeActivityBreakdownSkeleton grouping={grouping} columns={columns} />;
	}

	return (
		<DashboardSection
			title={title}
			ariaLabel={title}
			actions={
				showsToggleAll && (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={toggleAll}
						className="text-muted-foreground"
					>
						{toggleAllLabelOf(isAnyOpen, t)}
					</Button>
				)
			}
		>
			<div role="table" aria-label={title} style={gridStyle}>
				{showsHeader && (
					<ReportHeaderRow gridClassName={BREAKDOWN_GRID}>
						<HeaderCells path={path} columns={columns} />
					</ReportHeaderRow>
				)}
				{showsError && <DashboardErrorNotice onRetry={onRetry} className="m-3" />}
				{showsEmpty && (
					<BreakdownEmpty
						period={period}
						hasFilters={hasFilters}
						onClearFilters={onClearFilters}
						onPreviousPeriod={onPreviousPeriod}
					/>
				)}
				{showsRows && (
					<>
						<div className="hairline-divide-y divide-border">
							{tree.nodes.map((node, index) => (
								<div
									key={node.key}
									role="rowgroup"
									className="[contain-intrinsic-size:auto_2.75rem] [content-visibility:auto]"
								>
									<BreakdownBranch
										node={node}
										rank={index + 1}
										lineage={EMPTY_LINEAGE}
										isLast={isLastIndex(index, topCount)}
										context={context}
									/>
								</div>
							))}
						</div>
						<ReportTotalsRow gridClassName={BREAKDOWN_GRID}>
							<TotalsCells
								totals={tree.totals}
								topDimension={path[0]}
								topCount={topCount}
								projectCount={projectCount}
								columns={columns}
								text={text}
							/>
						</ReportTotalsRow>
					</>
				)}
			</div>
		</DashboardSection>
	);
}
