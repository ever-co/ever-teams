'use client';

import { memo, useCallback, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AnimatedHeight } from '@/core/components/common/animated-height';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { SelectedMark } from '@/core/components/common/selected-mark';
import { FoldToggle } from '@/core/components/dashboards/kit/fold-toggle';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { Button } from '@/core/components/duplicated-components/_button';
import { ArrowUp, ChevronDown, ChevronsUpDown, Sort } from '@/core/components/icons';
import type { TeamDashboardState } from '@/core/hooks/dashboards/team/use-team-dashboard';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import {
	DEFAULT_MEMBER_SORT,
	type LiveMember,
	type MemberSort,
	type MemberSortKey,
	type MemberTableRow,
	memberTableRowsOf,
	nextMemberSortOf,
	type SortDirection,
	sortedMemberRows
} from '@/core/lib/utils/dashboards/team';
import { TeamCard } from './team-card';
import { FULL_SPAN } from './team-grid';
import { doingTextOf, isQuietMember, memberNameOf, StateChip, StateDot } from './team-live-parts';
import { MemberFace } from './team-marks';
import { TeamMemberSheet } from './team-member-sheet';
import { ProjectChip } from './team-project-chip';
import { TEAM_MEMBERS_ANCHOR } from './team-today-card';

type Translate = ReturnType<typeof useTranslations>;

const MISSING_FIGURE = '–';

const TABLE_GRID =
	'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 md:grid-cols-[minmax(11rem,1.4fr)_7.5rem_minmax(9rem,2fr)_4.5rem_5.5rem_3rem_minmax(7rem,1fr)]';

const WIDE_CELL = 'max-md:hidden';

const NUMBER = 'text-right text-[13px] tabular-nums';

const VISIBLE_ROWS = 5;

/** Rows of figures are the one place for lines (DESIGN-SYSTEM 20): solid hairlines between rows, none around. */
const ROWS = 'hairline-divide-y divide-border';

const ROW_BUTTON =
	'min-h-13 w-full px-2 text-left outline-none transition-colors hover:bg-foreground/[0.03] focus-visible:bg-foreground/[0.03] focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/25';

const MUTED_CELL = 'text-[13px] text-muted-foreground';

/** Sets the text column apart from the right-aligned Days figure next to it. */
const TOP_PROJECT_CELL = 'md:pl-4';

const SORT_KEYS: ReadonlyArray<MemberSortKey> = ['status', 'name', 'today', 'period', 'days'];

const SORT_LABEL_KEYS = {
	status: 'common.STATUS',
	name: 'dashboard.team.table.MEMBER',
	today: 'common.TODAY',
	period: 'dashboard.team.figures.THIS_PERIOD',
	days: 'dashboard.team.table.DAYS'
} as const;

const DIRECTIONS: ReadonlyArray<SortDirection> = ['asc', 'desc'];

const DIRECTION_LABEL_KEYS = {
	asc: 'dashboard.team.roster.ASCENDING',
	desc: 'dashboard.team.roster.DESCENDING'
} as const;

function roleOf(row: MemberTableRow, t: Translate) {
	if (row.member.profile.isManager) {
		return t('common.MANAGER');
	}
	return t('common.MEMBER');
}

function DirectionIcon({ direction }: Readonly<{ direction: SortDirection }>) {
	return (
		<ArrowUp
			aria-hidden="true"
			className={cn('size-3.5 shrink-0 transition-transform', direction === 'desc' && 'rotate-180')}
		/>
	);
}

function SortGlyph({ isActive, direction }: Readonly<{ isActive: boolean; direction: SortDirection }>) {
	if (isActive) {
		return <DirectionIcon direction={direction} />;
	}
	return <ChevronsUpDown aria-hidden="true" className="size-3 shrink-0 text-muted-foreground/50" />;
}

function SortHeader({
	column,
	sort,
	onSort,
	alignEnd = false,
	className
}: Readonly<{
	column: MemberSortKey;
	sort: MemberSort;
	onSort: (key: MemberSortKey) => void;
	alignEnd?: boolean;
	className?: string;
}>) {
	const t = useTranslations();
	const isActive = sort.key === column;
	const label = t(SORT_LABEL_KEYS[column]);
	return (
		<span className={cn('flex min-w-0', alignEnd && 'justify-end', className)}>
			<button
				type="button"
				onClick={() => onSort(column)}
				aria-label={t('dashboard.team.table.SORT_BY', { column: label })}
				className={cn(
					'-mx-1.5 inline-flex min-w-0 items-center gap-1 rounded-md px-1.5 py-1 outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25',
					isActive && 'text-foreground'
				)}
			>
				<span className="truncate">{label}</span>
				<SortGlyph isActive={isActive} direction={sort.direction} />
			</button>
		</span>
	);
}

function PlainHeader({ label, className }: Readonly<{ label: string; className?: string }>) {
	return <span className={cn('truncate', className)}>{label}</span>;
}

function SortMenu({ sort, onSort }: Readonly<{ sort: MemberSort; onSort: (key: MemberSortKey) => void }>) {
	const t = useTranslations();
	const currentLabel = t(SORT_LABEL_KEYS[sort.key]);
	const pickDirection = (direction: SortDirection) => {
		const isCurrentDirection = direction === sort.direction;
		if (isCurrentDirection) {
			return;
		}
		onSort(sort.key);
	};
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="default"
					aria-label={t('dashboard.team.table.SORT_BY', { column: currentLabel })}
				>
					<Sort aria-hidden="true" className="text-muted-foreground" />
					<span>{currentLabel}</span>
					<ChevronDown aria-hidden="true" className="size-3.5 text-muted-foreground" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-48">
				<DropdownMenuGroup>
					<DropdownMenuLabel>{t('common.SORT')}</DropdownMenuLabel>
					{SORT_KEYS.map((key) => (
						<DropdownMenuItem key={key} onClick={() => onSort(key)}>
							<span className="flex-1">{t(SORT_LABEL_KEYS[key])}</span>
							{key === sort.key && <SelectedMark />}
						</DropdownMenuItem>
					))}
				</DropdownMenuGroup>
				<DropdownMenuGroup>
					{DIRECTIONS.map((direction) => (
						<DropdownMenuItem key={direction} onClick={() => pickDirection(direction)}>
							<DirectionIcon direction={direction} />
							<span className="flex-1">{t(DIRECTION_LABEL_KEYS[direction])}</span>
							{direction === sort.direction && <SelectedMark />}
						</DropdownMenuItem>
					))}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function periodTextOf(row: MemberTableRow) {
	const seconds = row.roster?.summary.seconds;
	if (!seconds) {
		return MISSING_FIGURE;
	}
	return formatDurationShort(seconds);
}

function daysTextOf(row: MemberTableRow) {
	const dayCount = row.roster?.summary.dayCount;
	if (!dayCount) {
		return MISSING_FIGURE;
	}
	return String(dayCount);
}

function todayTextOf(member: LiveMember) {
	const hasToday = member.todaySeconds > 0;
	if (!hasToday) {
		return MISSING_FIGURE;
	}
	return formatDurationShort(member.todaySeconds);
}

function FigureSkeleton({ className }: Readonly<{ className: string }>) {
	return <span aria-hidden="true" className={cn('block h-2.5', SKELETON_BAR, className)} />;
}

function CurrentTaskCell({ member, title }: Readonly<{ member: LiveMember; title: string }>) {
	const { task } = member;
	if (!task) {
		return <span className={cn(MUTED_CELL, WIDE_CELL)}>{MISSING_FIGURE}</span>;
	}
	return (
		<span className={cn('truncate text-[13px] text-foreground', WIDE_CELL)} title={title}>
			{task.numberLabel && <span className="mr-1 tabular-nums text-muted-foreground">{task.numberLabel}</span>}
			{task.title}
		</span>
	);
}

/** A real project is a chip; time without a project is a plain muted name, never a box around a missing value. */
function TopProjectCell({ row, isPeriodLoading }: Readonly<{ row: MemberTableRow; isPeriodLoading: boolean }>) {
	const t = useTranslations();
	if (isPeriodLoading) {
		return <FigureSkeleton className="w-20" />;
	}
	const project = row.roster?.topProject ?? null;
	if (!project) {
		return <span className={MUTED_CELL}>{MISSING_FIGURE}</span>;
	}
	if (project.isNoProject) {
		return <span className={cn(MUTED_CELL, 'truncate')}>{t('dashboard.team.projects.NONE')}</span>;
	}
	return <ProjectChip project={project} />;
}

const MemberTableRowButton = memo(function MemberTableRowButton({
	row,
	dayFormat,
	isPeriodLoading,
	onOpen
}: Readonly<{
	row: MemberTableRow;
	dayFormat: Intl.DateTimeFormat;
	isPeriodLoading: boolean;
	onOpen: (employeeId: string) => void;
}>) {
	const t = useTranslations();
	const { member } = row;
	const name = memberNameOf(member.name, t);
	const isQuiet = isQuietMember(member);
	const doingText = doingTextOf(member, dayFormat, t);
	return (
		<li>
			<button
				type="button"
				onClick={() => onOpen(member.employeeId)}
				aria-label={t('dashboard.team.table.OPEN_MEMBER', { name })}
				className={cn(TABLE_GRID, ROW_BUTTON)}
			>
				<span className="flex min-w-0 items-center gap-2.5">
					<span className="relative shrink-0">
						<MemberFace name={name} imageUrl={member.imageUrl} className="size-8 text-[11px]" />
						<StateDot state={member.state} className="md:hidden" />
					</span>
					<span className="flex min-w-0 flex-col">
						<span className={cn('truncate text-[13px] font-medium', isQuiet && 'text-muted-foreground')}>
							{name}
						</span>
						<span className="truncate text-xs text-muted-foreground">{roleOf(row, t)}</span>
					</span>
				</span>
				<span className={WIDE_CELL}>
					<StateChip state={member.state} />
				</span>
				<CurrentTaskCell member={member} title={doingText} />
				<span className={cn(NUMBER, isQuiet && 'text-muted-foreground', !isQuiet && 'text-foreground')}>
					{todayTextOf(member)}
				</span>
				<span className={cn(NUMBER, 'text-foreground', WIDE_CELL)}>
					{isPeriodLoading && <FigureSkeleton className="ml-auto w-12" />}
					{!isPeriodLoading && periodTextOf(row)}
				</span>
				<span className={cn(NUMBER, 'text-muted-foreground', WIDE_CELL)}>
					{isPeriodLoading && <FigureSkeleton className="ml-auto w-4" />}
					{!isPeriodLoading && daysTextOf(row)}
				</span>
				<span className={cn('flex min-w-0', WIDE_CELL, TOP_PROJECT_CELL)}>
					<TopProjectCell row={row} isPeriodLoading={isPeriodLoading} />
				</span>
			</button>
		</li>
	);
});

function TableHeader({ sort, onSort }: Readonly<{ sort: MemberSort; onSort: (key: MemberSortKey) => void }>) {
	const t = useTranslations();
	return (
		<div
			className={cn(
				TABLE_GRID,
				'min-h-9 px-2 text-xs font-medium text-muted-foreground hairline-b border-border'
			)}
		>
			<SortHeader column="name" sort={sort} onSort={onSort} />
			<SortHeader column="status" sort={sort} onSort={onSort} className={WIDE_CELL} />
			<PlainHeader label={t('dashboard.team.sheet.CURRENT_TASK')} className={WIDE_CELL} />
			<SortHeader column="today" sort={sort} onSort={onSort} alignEnd />
			<SortHeader column="period" sort={sort} onSort={onSort} alignEnd className={WIDE_CELL} />
			<SortHeader column="days" sort={sort} onSort={onSort} alignEnd className={WIDE_CELL} />
			<PlainHeader label={t('dashboard.team.table.TOP_PROJECT')} className={cn(WIDE_CELL, TOP_PROJECT_CELL)} />
		</div>
	);
}

export function TeamMembersTableSkeleton() {
	const t = useTranslations();
	return (
		<TeamCard title={t('dashboard.team.cards.TEAM_MEMBERS')} className={FULL_SPAN}>
			<TableHeader sort={DEFAULT_MEMBER_SORT} onSort={() => undefined} />
			<ul aria-hidden="true" className={ROWS}>
				{Array.from({ length: VISIBLE_ROWS }).map((_, index) => (
					<li key={index} className={cn(TABLE_GRID, 'min-h-13 px-2')}>
						<span className="flex items-center gap-2.5">
							<span className="size-8 shrink-0 animate-pulse rounded-full bg-foreground/[0.06]" />
							<span className="flex flex-col gap-1.5">
								<span className={cn('h-2.5 w-28', SKELETON_BAR)} />
								<span className={cn('h-2 w-14', SKELETON_BAR)} />
							</span>
						</span>
						<span className={cn('h-4 w-16', SKELETON_BAR, WIDE_CELL)} />
						<span className={cn('h-2.5 w-40', SKELETON_BAR, WIDE_CELL)} />
						<span className={cn('ml-auto h-2.5 w-10', SKELETON_BAR)} />
						<span className={cn('ml-auto h-2.5 w-12', SKELETON_BAR, WIDE_CELL)} />
						<span className={cn('ml-auto h-2.5 w-4', SKELETON_BAR, WIDE_CELL)} />
						<span className={cn('h-4 w-20', SKELETON_BAR, WIDE_CELL, 'md:ml-4')} />
					</li>
				))}
			</ul>
		</TeamCard>
	);
}

function findRow(rows: ReadonlyArray<MemberTableRow>, employeeId: string | null) {
	if (!employeeId) {
		return null;
	}
	return rows.find((row) => row.member.employeeId === employeeId) ?? null;
}

export function TeamMembersTable({ dashboard }: Readonly<{ dashboard: TeamDashboardState }>) {
	const t = useTranslations();
	const locale = useLocale();
	const [sort, setSort] = useState<MemberSort>(DEFAULT_MEMBER_SORT);
	const [isExpanded, setIsExpanded] = useState(false);
	const [openedId, setOpenedId] = useState<string | null>(null);
	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const { liveMembers, isMembersLoading } = dashboard.live;
	const { rosterMembers } = dashboard;
	const isPeriodLoading = dashboard.isReportLoading;
	const dayFormat = useMemo(
		() => new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }),
		[locale]
	);
	const rows = useMemo(() => memberTableRowsOf(liveMembers, rosterMembers), [liveMembers, rosterMembers]);
	const sortedRows = useMemo(() => sortedMemberRows(rows, sort), [rows, sort]);
	const openedRow = findRow(rows, openedId);

	const toggleSort = useCallback((key: MemberSortKey) => {
		setSort((current) => nextMemberSortOf(current, key));
	}, []);
	const toggleExpanded = useCallback(() => setIsExpanded((current) => !current), []);
	const openMember = useCallback((employeeId: string) => {
		setOpenedId(employeeId);
		setIsSheetOpen(true);
	}, []);
	const closeSheet = useCallback(() => setIsSheetOpen(false), []);
	const renderRow = useCallback(
		(row: MemberTableRow) => (
			<MemberTableRowButton
				key={row.member.employeeId}
				row={row}
				dayFormat={dayFormat}
				isPeriodLoading={isPeriodLoading}
				onOpen={openMember}
			/>
		),
		[dayFormat, isPeriodLoading, openMember]
	);

	if (isMembersLoading) {
		return <TeamMembersTableSkeleton />;
	}

	const title = t('dashboard.team.cards.TEAM_MEMBERS');
	const meta = t('dashboard.team.META_MEMBERS', { count: rows.length });
	const hasRows = rows.length > 0;
	const visibleRows = sortedRows.slice(0, VISIBLE_ROWS);
	const foldedRows = sortedRows.slice(VISIBLE_ROWS);
	const foldedCount = foldedRows.length;
	const canFold = foldedCount > 0;
	let toggleLabel = t('dashboard.team.table.SHOW_MORE_MEMBERS', { count: foldedCount });
	if (isExpanded) {
		toggleLabel = t('dashboard.team.table.SHOW_FEWER');
	}

	return (
		<TeamCard
			id={TEAM_MEMBERS_ANCHOR}
			title={title}
			meta={meta}
			control={
				<span className="md:hidden">
					<SortMenu sort={sort} onSort={toggleSort} />
				</span>
			}
			className={FULL_SPAN}
		>
			{!hasRows && (
				<p className="py-6 text-center text-[13px] text-muted-foreground">{t('dashboard.team.live.EMPTY')}</p>
			)}
			{hasRows && (
				<div>
					<TableHeader sort={sort} onSort={toggleSort} />
					<ul className={ROWS}>{visibleRows.map(renderRow)}</ul>
					{canFold && (
						<>
							<AnimatedHeight>
								{isExpanded && (
									<ul className={cn(ROWS, 'hairline-t border-border')}>
										{foldedRows.map(renderRow)}
									</ul>
								)}
							</AnimatedHeight>
							<div className="pt-2">
								<FoldToggle
									label={toggleLabel}
									isExpanded={isExpanded}
									onToggle={toggleExpanded}
									className="-ml-0.5"
								/>
							</div>
						</>
					)}
				</div>
			)}
			<TeamMemberSheet
				dashboard={dashboard}
				isOpen={isSheetOpen}
				member={openedRow?.member ?? null}
				roster={openedRow?.roster ?? null}
				onClose={closeSheet}
			/>
		</TeamCard>
	);
}
