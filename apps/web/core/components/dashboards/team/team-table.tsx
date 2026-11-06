'use client';

import { memo, type ReactNode, useCallback, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
	DashboardSection,
	GroupToggle,
	ReportGroup,
	ReportHeaderRow,
	ReportTotalsRow
} from '@/core/components/dashboards/kit/dashboard-layout';
import {
	BlockEmptyMessage,
	DashboardErrorNotice,
	RowsSkeleton
} from '@/core/components/dashboards/kit/dashboard-states';
import { MemberCell } from '@/core/components/dashboards/kit/member-cell';
import { ActivityFigure, ShareMeter } from '@/core/components/dashboards/kit/meters';
import { NUMBER_CELL } from '@/core/components/dashboards/kit/recipes';
import { Button } from '@/core/components/duplicated-components/_button';
import { ChevronDown, ChevronUp } from '@/core/components/icons';
import type { TeamDashboardState } from '@/core/hooks/dashboards/team/use-team-dashboard';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort, formatPercent, percentOf } from '@/core/lib/utils/dashboard-figures';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { shiftPeriod } from '@/core/lib/utils/dashboard-period';
import {
	DEFAULT_TEAM_SORTS,
	type DaySummary,
	localDateOfKey,
	type MemberSummary,
	type SortDirection,
	type TeamSort,
	type TeamSortKey,
	type TeamTableView
} from '@/core/lib/utils/dashboards/team';
import type { DailyReportTask } from '@/core/lib/utils/daily-report-figures';

/** Member or day, tracked, activity, days or members, projects, share. Phones keep the first three. */
const TABLE_GRID =
	'grid grid-cols-[minmax(0,1fr)_4.75rem_5.75rem] items-center gap-x-3 px-4 md:grid-cols-[minmax(0,1fr)_5.5rem_6rem_4rem_4.5rem_minmax(6rem,9rem)]';

const WIDE_CELL = 'max-md:hidden';

const DETAIL_ROW = cn(TABLE_GRID, 'min-h-8');

const DETAIL_NAME = 'min-w-0 truncate pl-6 text-[13px] text-foreground';

const DETAIL_LABEL = 'px-4 pt-2.5 pb-1 pl-10 text-xs font-medium text-muted-foreground';

/** Repeated rows skip layout and paint while they are off screen; open groups keep their measured height. */
const OFFSCREEN_ROW = '[content-visibility:auto] [contain-intrinsic-size:auto_2.75rem]';

const SHOWN_TASKS = 8;

type Translate = ReturnType<typeof useTranslations>;

interface TableFormats {
	dayLong: Intl.DateTimeFormat;
	dayShort: Intl.DateTimeFormat;
	monthDay: Intl.DateTimeFormat;
	monthDayYear: Intl.DateTimeFormat;
	number: Intl.NumberFormat;
	todayKey: string;
}

function tableFormatsOf(locale: string): TableFormats {
	return {
		dayLong: new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'short', day: 'numeric' }),
		dayShort: new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }),
		monthDay: new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }),
		monthDayYear: new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }),
		number: new Intl.NumberFormat(locale),
		todayKey: localDayKeyOf(new Date())
	};
}

function shortDateOf(date: Date, formats: TableFormats) {
	const isCurrentYear = date.getFullYear() === new Date().getFullYear();
	if (isCurrentYear) {
		return formats.monthDay.format(date);
	}
	return formats.monthDayYear.format(date);
}

function ariaSortOf(isActive: boolean, direction: SortDirection) {
	if (!isActive) {
		return 'none';
	}
	if (direction === 'asc') {
		return 'ascending';
	}
	return 'descending';
}

function SortIcon({ direction }: Readonly<{ direction: SortDirection }>) {
	if (direction === 'asc') {
		return <ChevronUp aria-hidden="true" className="size-3.5 shrink-0" />;
	}
	return <ChevronDown aria-hidden="true" className="size-3.5 shrink-0" />;
}

function SortHeader({
	column,
	label,
	sort,
	onSort,
	alignEnd = true,
	className
}: Readonly<{
	column: TeamSortKey;
	label: string;
	sort: TeamSort;
	onSort: (key: TeamSortKey) => void;
	alignEnd?: boolean;
	className?: string;
}>) {
	const t = useTranslations();
	const isActive = sort.key === column;
	return (
		<div
			role="columnheader"
			aria-sort={ariaSortOf(isActive, sort.direction)}
			className={cn('flex min-w-0', alignEnd && 'justify-end', className)}
		>
			<button
				type="button"
				onClick={() => onSort(column)}
				title={t('dashboard.team.table.SORT_BY', { column: label })}
				className={cn(
					'-mx-1.5 inline-flex min-w-0 items-center gap-1 rounded-md px-1.5 py-1 outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25',
					isActive && 'text-foreground'
				)}
			>
				<span className="truncate">{label}</span>
				{isActive && <SortIcon direction={sort.direction} />}
			</button>
		</div>
	);
}

function ShareCell({ share, className }: Readonly<{ share: number; className?: string }>) {
	return (
		<span role="cell" className={cn('flex min-w-0 items-center gap-2', className)}>
			<ShareMeter share={share} className="flex-1" />
			<span className="w-9 shrink-0 text-right text-[13px] tabular-nums text-muted-foreground">
				{formatPercent(share)}
			</span>
		</span>
	);
}

function EmptyCell({ className }: Readonly<{ className?: string }>) {
	return <span role="cell" className={className} />;
}

function taskTitleOf(task: DailyReportTask, t: Translate) {
	if (task.title) {
		return task.title;
	}
	return t('dashboard.team.table.NO_TASK');
}

function memberNameOf(name: string, t: Translate) {
	if (name) {
		return name;
	}
	return t('dashboard.team.UNNAMED_MEMBER');
}

function MemberTasks({ member }: Readonly<{ member: MemberSummary }>) {
	const t = useTranslations();
	const [showsAll, setShowsAll] = useState(false);
	const tasks = member.tasks;
	const hiddenCount = Math.max(tasks.length - SHOWN_TASKS, 0);
	const hasHidden = hiddenCount > 0;
	const showsMoreButton = hasHidden && !showsAll;
	let shownTasks = tasks;
	if (!showsAll) {
		shownTasks = tasks.slice(0, SHOWN_TASKS);
	}
	if (tasks.length === 0) {
		return null;
	}
	return (
		<>
			<div className={DETAIL_LABEL}>{t('dashboard.team.table.TASKS')}</div>
			{shownTasks.map((task) => {
				const title = taskTitleOf(task, t);
				const share = percentOf(task.seconds, member.seconds);
				return (
					<div key={task.key} role="row" className={DETAIL_ROW}>
						<span role="rowheader" className={DETAIL_NAME} title={title}>
							{title}
						</span>
						<span role="cell" className={NUMBER_CELL}>
							{formatDurationShort(task.seconds)}
						</span>
						<EmptyCell />
						<EmptyCell className={WIDE_CELL} />
						<EmptyCell className={WIDE_CELL} />
						<ShareCell share={share} className={WIDE_CELL} />
					</div>
				);
			})}
			{showsMoreButton && (
				<div className="px-4 pt-1 pl-10">
					<button
						type="button"
						onClick={() => setShowsAll(true)}
						className="-mx-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-primary-ink outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-[3px] focus-visible:ring-ring/25"
					>
						{t('dashboard.team.table.MORE_TASKS', { count: hiddenCount })}
					</button>
				</div>
			)}
		</>
	);
}

function MemberDetail({ member, formats }: Readonly<{ member: MemberSummary; formats: TableFormats }>) {
	const t = useTranslations();
	return (
		<div className="bg-foreground/[0.015] pb-2">
			<div className={DETAIL_LABEL}>{t('dashboard.team.table.DAYS_WORKED')}</div>
			{member.days.map((day) => {
				const date = localDateOfKey(day.dateKey);
				return (
					<div key={day.key} role="row" className={DETAIL_ROW}>
						<span role="rowheader" className={DETAIL_NAME}>
							{formats.dayShort.format(date)}
						</span>
						<span role="cell" className={NUMBER_CELL}>
							{formatDurationShort(day.seconds)}
						</span>
						<span role="cell" className="flex justify-end">
							<ActivityFigure percent={day.activity} />
						</span>
						<EmptyCell className={WIDE_CELL} />
						<span role="cell" className={cn(NUMBER_CELL, WIDE_CELL)}>
							{formats.number.format(day.projectCount)}
						</span>
						<ShareCell share={day.share} className={WIDE_CELL} />
					</div>
				);
			})}
			<MemberTasks member={member} />
		</div>
	);
}

const MemberGroup = memo(function MemberGroup({
	member,
	isOpen,
	onToggle,
	formats
}: Readonly<{
	member: MemberSummary;
	isOpen: boolean;
	onToggle: (key: string) => void;
	formats: TableFormats;
}>) {
	const t = useTranslations();
	const name = memberNameOf(member.name, t);
	return (
		<div className={OFFSCREEN_ROW}>
			<ReportGroup
				isOpen={isOpen}
				headerClassName={TABLE_GRID}
				header={
					<>
						<span role="rowheader" className="flex min-w-0">
							<GroupToggle isOpen={isOpen} onToggle={() => onToggle(member.key)} className="font-normal">
								<MemberCell name={name} imageUrl={member.imageUrl} />
							</GroupToggle>
						</span>
						<span role="cell" className={cn(NUMBER_CELL, 'font-medium')}>
							{formatDurationShort(member.seconds)}
						</span>
						<span role="cell" className="flex justify-end">
							<ActivityFigure percent={member.activity} />
						</span>
						<span role="cell" className={cn(NUMBER_CELL, WIDE_CELL)}>
							{formats.number.format(member.dayCount)}
						</span>
						<span role="cell" className={cn(NUMBER_CELL, WIDE_CELL)}>
							{formats.number.format(member.projectCount)}
						</span>
						<ShareCell share={member.share} className={WIDE_CELL} />
					</>
				}
			>
				<MemberDetail member={member} formats={formats} />
			</ReportGroup>
		</div>
	);
});

const DayGroup = memo(function DayGroup({
	day,
	isOpen,
	onToggle,
	formats
}: Readonly<{
	day: DaySummary;
	isOpen: boolean;
	onToggle: (key: string) => void;
	formats: TableFormats;
}>) {
	const t = useTranslations();
	const date = localDateOfKey(day.dateKey);
	const isToday = day.dateKey === formats.todayKey;
	return (
		<div className={OFFSCREEN_ROW}>
			<ReportGroup
				isOpen={isOpen}
				headerClassName={TABLE_GRID}
				header={
					<>
						<span role="rowheader" className="flex min-w-0">
							<GroupToggle isOpen={isOpen} onToggle={() => onToggle(day.key)}>
								<span className="truncate">{formats.dayLong.format(date)}</span>
								{isToday && (
									<span className="shrink-0 text-xs font-normal text-primary-ink">
										{t('common.TODAY')}
									</span>
								)}
							</GroupToggle>
						</span>
						<span role="cell" className={cn(NUMBER_CELL, 'font-medium')}>
							{formatDurationShort(day.seconds)}
						</span>
						<span role="cell" className="flex justify-end">
							<ActivityFigure percent={day.activity} />
						</span>
						<span role="cell" className={cn(NUMBER_CELL, WIDE_CELL)}>
							{formats.number.format(day.memberCount)}
						</span>
						<span role="cell" className={cn(NUMBER_CELL, WIDE_CELL)}>
							{formats.number.format(day.projectCount)}
						</span>
						<ShareCell share={day.share} className={WIDE_CELL} />
					</>
				}
			>
				<div className="bg-foreground/[0.015] py-1">
					{day.members.map((member) => (
						<div key={member.key} role="row" className={cn(TABLE_GRID, 'min-h-10')}>
							<span role="rowheader" className="min-w-0 pl-6">
								<MemberCell name={memberNameOf(member.name, t)} imageUrl={member.imageUrl} />
							</span>
							<span role="cell" className={NUMBER_CELL}>
								{formatDurationShort(member.seconds)}
							</span>
							<span role="cell" className="flex justify-end">
								<ActivityFigure percent={member.activity} />
							</span>
							<EmptyCell className={WIDE_CELL} />
							<span role="cell" className={cn(NUMBER_CELL, WIDE_CELL)}>
								{formats.number.format(member.projectCount)}
							</span>
							<ShareCell share={member.share} className={WIDE_CELL} />
						</div>
					))}
				</div>
			</ReportGroup>
		</div>
	);
});

function TeamTableHeader({
	view,
	sort,
	onSort
}: Readonly<{ view: TeamTableView; sort: TeamSort; onSort: (key: TeamSortKey) => void }>) {
	const t = useTranslations();
	const isMemberView = view === 'member';
	let nameLabel = t('dashboard.team.table.DAY');
	let countLabel = t('dashboard.team.table.MEMBERS');
	if (isMemberView) {
		nameLabel = t('dashboard.team.table.MEMBER');
		countLabel = t('dashboard.team.table.DAYS');
	}
	return (
		<ReportHeaderRow gridClassName={TABLE_GRID}>
			<SortHeader column="name" label={nameLabel} sort={sort} onSort={onSort} alignEnd={false} />
			<SortHeader column="tracked" label={t('dashboard.team.table.TRACKED')} sort={sort} onSort={onSort} />
			<SortHeader column="activity" label={t('dashboard.team.table.ACTIVITY')} sort={sort} onSort={onSort} />
			<SortHeader column="count" label={countLabel} sort={sort} onSort={onSort} className={WIDE_CELL} />
			<SortHeader
				column="projects"
				label={t('dashboard.team.table.PROJECTS')}
				sort={sort}
				onSort={onSort}
				className={WIDE_CELL}
			/>
			<SortHeader
				column="share"
				label={t('dashboard.team.table.SHARE')}
				sort={sort}
				onSort={onSort}
				className={WIDE_CELL}
			/>
		</ReportHeaderRow>
	);
}

function TeamTableTotals({ dashboard, formats }: Readonly<{ dashboard: TeamDashboardState; formats: TableFormats }>) {
	const t = useTranslations();
	const { totals, view } = dashboard;
	const isMemberView = view === 'member';
	let countText = t('dashboard.team.table.DAY_COUNT', { count: totals.dayCount });
	let columnCount = totals.memberCount;
	if (isMemberView) {
		countText = t('dashboard.team.table.MEMBER_COUNT', { count: totals.memberCount });
		columnCount = totals.dayCount;
	}
	return (
		<ReportTotalsRow gridClassName={TABLE_GRID}>
			<span role="rowheader" className="truncate">
				{countText}
			</span>
			<span role="cell" className={NUMBER_CELL}>
				{formatDurationShort(totals.seconds)}
			</span>
			<span role="cell" className="flex justify-end">
				<ActivityFigure percent={totals.activity} />
			</span>
			<span role="cell" className={cn(NUMBER_CELL, WIDE_CELL)}>
				{formats.number.format(columnCount)}
			</span>
			<span role="cell" className={cn(NUMBER_CELL, WIDE_CELL)}>
				{formats.number.format(totals.projectCount)}
			</span>
			<EmptyCell className={WIDE_CELL} />
		</ReportTotalsRow>
	);
}

function TeamTableEmpty({ dashboard, formats }: Readonly<{ dashboard: TeamDashboardState; formats: TableFormats }>) {
	const t = useTranslations();
	const { period, hasFilters } = dashboard;
	if (hasFilters) {
		return (
			<BlockEmptyMessage
				title={t('dashboard.team.table.EMPTY_FILTERED_TITLE')}
				message={t('dashboard.team.table.EMPTY_FILTERED_MESSAGE')}
				action={
					<Button type="button" variant="outline" size="default" onClick={dashboard.clearFilters}>
						{t('common.CLEAR_FILTERS')}
					</Button>
				}
			/>
		);
	}
	const from = shortDateOf(period.from, formats);
	const to = shortDateOf(period.to, formats);
	const isOneDay = from === to;
	let title = t('dashboard.team.table.EMPTY_RANGE', { from, to });
	if (isOneDay) {
		title = t('dashboard.team.table.EMPTY_DAY', { day: from });
	}
	const showPreviousPeriod = () => {
		const previousPeriod = shiftPeriod(period, -1);
		dashboard.setPeriod(previousPeriod);
	};
	return (
		<BlockEmptyMessage
			title={title}
			message={t('dashboard.team.table.EMPTY_MESSAGE')}
			action={
				<Button type="button" variant="outline" size="default" onClick={showPreviousPeriod}>
					{t('dashboard.team.table.PREVIOUS_PERIOD')}
				</Button>
			}
		/>
	);
}

function toggledKeys(current: ReadonlySet<string>, key: string) {
	const next = new Set(current);
	if (next.has(key)) {
		next.delete(key);
		return next;
	}
	next.add(key);
	return next;
}

function tableTitleOf(view: TeamTableView, t: Translate) {
	if (view === 'member') {
		return t('dashboard.team.table.TITLE_MEMBERS');
	}
	return t('dashboard.team.table.TITLE_DAYS');
}

function keepSort() {
	return undefined;
}

/** Drawn by the route skeleton and by the page while the report loads: one picture from the route to the rows. */
export function TeamTableSkeleton({
	view = 'member',
	sort,
	onSort = keepSort
}: Readonly<{ view?: TeamTableView; sort?: TeamSort; onSort?: (key: TeamSortKey) => void }>) {
	const t = useTranslations();
	const title = tableTitleOf(view, t);
	const shownSort = sort ?? DEFAULT_TEAM_SORTS[view];
	return (
		<DashboardSection title={title} ariaLabel={title}>
			<div role="table" aria-label={title} aria-busy="true">
				<TeamTableHeader view={view} sort={shownSort} onSort={onSort} />
				<div className="hairline-divide-y divide-border">
					<RowsSkeleton rows={6} gridClassName={TABLE_GRID} cellCount={3} />
				</div>
			</div>
		</DashboardSection>
	);
}

export function TeamTable({ dashboard }: Readonly<{ dashboard: TeamDashboardState }>) {
	const t = useTranslations();
	const locale = useLocale();
	const formats = useMemo(() => tableFormatsOf(locale), [locale]);
	const [openKeys, setOpenKeys] = useState<ReadonlySet<string>>(() => new Set());
	const { view, members, days, totals } = dashboard;
	const isMemberView = view === 'member';
	const hasRows = dashboard.rows.length > 0;

	const toggleMember = useCallback((key: string) => {
		setOpenKeys((current) => toggledKeys(current, `member:${key}`));
	}, []);

	const toggleDay = useCallback((key: string) => {
		setOpenKeys((current) => toggledKeys(current, `day:${key}`));
	}, []);

	const title = tableTitleOf(view, t);
	let meta = t('dashboard.team.table.DAY_COUNT', { count: totals.dayCount });
	if (isMemberView) {
		meta = t('dashboard.team.table.MEMBER_COUNT', { count: totals.memberCount });
	}

	if (dashboard.isReportLoading) {
		return <TeamTableSkeleton view={view} sort={dashboard.sort} onSort={dashboard.toggleSort} />;
	}

	let body: ReactNode = null;
	if (dashboard.isReportError) {
		body = <DashboardErrorNotice onRetry={dashboard.refetchReport} className="m-3" />;
	} else if (!hasRows) {
		body = <TeamTableEmpty dashboard={dashboard} formats={formats} />;
	} else if (isMemberView) {
		body = members.map((member) => (
			<MemberGroup
				key={member.key}
				member={member}
				isOpen={openKeys.has(`member:${member.key}`)}
				onToggle={toggleMember}
				formats={formats}
			/>
		));
	} else {
		body = days.map((day) => (
			<DayGroup
				key={day.key}
				day={day}
				isOpen={openKeys.has(`day:${day.key}`)}
				onToggle={toggleDay}
				formats={formats}
			/>
		));
	}

	return (
		<DashboardSection title={title} meta={hasRows && meta} ariaLabel={title}>
			<div role="table" aria-label={title} aria-busy={dashboard.isRefreshing}>
				<TeamTableHeader view={view} sort={dashboard.sort} onSort={dashboard.toggleSort} />
				<div className="hairline-divide-y divide-border">{body}</div>
				{hasRows && <TeamTableTotals dashboard={dashboard} formats={formats} />}
			</div>
		</DashboardSection>
	);
}
