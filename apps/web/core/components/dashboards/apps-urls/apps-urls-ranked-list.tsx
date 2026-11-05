'use client';

import { memo, useCallback, useMemo, useState } from 'react';
import { type DottedLanguageObjectStringPaths, useLocale, useTranslations } from 'next-intl';
import {
	DashboardSection,
	GroupToggle,
	ReportGroup,
	ReportHeaderRow,
	ReportTotalsRow
} from '@/core/components/dashboards/kit/dashboard-layout';
import { ShareMeter } from '@/core/components/dashboards/kit/meters';
import { NUMBER_CELL, SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { X } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort, formatPercent } from '@/core/lib/utils/dashboard-figures';
import {
	formatDayLabel,
	sortUsageGroups,
	timeRanksOf,
	VIEW_COLUMNS,
	type AppsUrlsView,
	type GroupSort,
	type GroupSortColumn,
	type MosaicItem,
	type UsageGroup,
	type UsageGroupRow,
	type UsageTotals
} from '@/core/lib/utils/dashboards/apps-urls';
import { AppTitleCell, PersonCell, ProjectCell } from './usage-cells';
import { DisclosureAction, nextSortOf, ShareHeader, SortHeader, useGroupDisclosure } from './apps-urls-list-controls';

/** Rank, the lead, the member and project cells from md, the share meter from md, the share and the time. */
const TWO_SIDE_GRID =
	'grid grid-cols-[1.5rem_minmax(0,1fr)_2.75rem_4.75rem] items-center gap-x-3 px-4 md:grid-cols-[1.75rem_minmax(0,1fr)_minmax(0,10rem)_minmax(0,9rem)_5.5rem_2.75rem_5rem]';

const ONE_SIDE_GRID =
	'grid grid-cols-[1.5rem_minmax(0,1fr)_2.75rem_4.75rem] items-center gap-x-3 px-4 md:grid-cols-[1.75rem_minmax(0,1fr)_minmax(0,12rem)_5.5rem_2.75rem_5rem]';

const VIEW_GRIDS: Record<AppsUrlsView, string> = {
	date: TWO_SIDE_GRID,
	employee: ONE_SIDE_GRID,
	project: ONE_SIDE_GRID,
	application: TWO_SIDE_GRID
};

const LIST_TITLE_KEYS: Record<AppsUrlsView, DottedLanguageObjectStringPaths> = {
	date: 'dashboard.appsUrls.DETAIL_DATE',
	employee: 'dashboard.appsUrls.DETAIL_EMPLOYEE',
	project: 'dashboard.appsUrls.DETAIL_PROJECT',
	application: 'dashboard.appsUrls.DETAIL_APPLICATION'
};

const FIRST_COLUMN_KEYS: Record<AppsUrlsView, DottedLanguageObjectStringPaths> = {
	date: 'dashboard.appsUrls.COLUMN_DATE',
	employee: 'dashboard.appsUrls.COLUMN_EMPLOYEE',
	project: 'dashboard.appsUrls.COLUMN_PROJECT',
	application: 'dashboard.appsUrls.COLUMN_APPLICATION'
};

const GROUP_COUNT_KEYS: Record<AppsUrlsView, DottedLanguageObjectStringPaths> = {
	date: 'dashboard.appsUrls.DAY_COUNT',
	employee: 'dashboard.appsUrls.MEMBER_COUNT',
	project: 'dashboard.appsUrls.PROJECT_COUNT',
	application: 'dashboard.appsUrls.TITLE_COUNT'
};

const RANK_CELL = 'text-xs tabular-nums text-muted-foreground';

const COUNT_CELL = 'truncate text-xs tabular-nums text-muted-foreground max-md:hidden';

const SIDE_CELL = 'min-w-0 max-md:hidden';

const METER_CELL = 'max-md:hidden';

const SHARE_CELL = 'text-right text-xs tabular-nums text-muted-foreground';

/** A thin guide under the group's chevron ties its rows to it, as a tree does. */
const LEAD_CELL =
	'relative min-w-0 pl-6 before:absolute before:inset-y-0 before:left-2 before:w-(--hairline) before:bg-border';

const LINE_ROW = 'min-h-9 py-1 [contain-intrinsic-size:auto_2.25rem] [content-visibility:auto]';

const CHIP =
	'inline-flex h-7 max-w-64 items-center gap-1.5 rounded-full bg-card pr-1 pl-2.5 text-xs hairline-ring ring-foreground/10';

const CHIP_REMOVE =
	'flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25';

/** Days keep the calendar order, so only the other groupings show a rank; days inside an app keep it too. */
function showsGroupRankIn(view: AppsUrlsView) {
	return view !== 'date';
}

function showsLineRankIn(view: AppsUrlsView) {
	return view !== 'application';
}

function groupMetaOf(group: UsageGroup, t: ReturnType<typeof useTranslations>) {
	if (group.view === 'application') {
		return t('dashboard.appsUrls.DAY_COUNT', { count: group.dayCount });
	}
	return t('dashboard.appsUrls.TITLE_COUNT', { count: group.titleCount });
}

function GroupLabel({ group, locale }: Readonly<{ group: UsageGroup; locale: string }>) {
	switch (group.view) {
		case 'date':
			return <span className="truncate">{formatDayLabel(group.sample.dateKey, locale)}</span>;
		case 'employee':
			return <PersonCell person={group.sample.employee} />;
		case 'project':
			return <ProjectCell project={group.sample.project} />;
		case 'application':
			return <AppTitleCell title={group.sample.title} />;
	}
}

function LineLead({ line, view, locale }: Readonly<{ line: UsageGroupRow; view: AppsUrlsView; locale: string }>) {
	if (view === 'application') {
		return (
			<span className="block truncate text-[13px] text-foreground">{formatDayLabel(line.dateKey, locale)}</span>
		);
	}
	return <AppTitleCell title={line.title} />;
}

function ShareCells({ share, locale }: Readonly<{ share: number; locale: string }>) {
	return (
		<>
			<span role="cell" className={METER_CELL}>
				<ShareMeter share={share} />
			</span>
			<span role="cell" className={SHARE_CELL}>
				{formatPercent(share, locale)}
			</span>
		</>
	);
}

const RankedLine = memo(function RankedLine({
	line,
	rank,
	view,
	locale
}: Readonly<{ line: UsageGroupRow; rank: number | null; view: AppsUrlsView; locale: string }>) {
	const columns = VIEW_COLUMNS[view];
	return (
		<div role="row" className={cn(VIEW_GRIDS[view], LINE_ROW)}>
			<span role="cell" className={RANK_CELL}>
				{rank}
			</span>
			<span role="cell" className={LEAD_CELL}>
				<LineLead line={line} view={view} locale={locale} />
			</span>
			{columns.showsMember && (
				<span role="cell" className={SIDE_CELL}>
					<PersonCell person={line.employee} />
				</span>
			)}
			{columns.showsProject && (
				<span role="cell" className={SIDE_CELL}>
					<ProjectCell project={line.project} />
				</span>
			)}
			<ShareCells share={line.share} locale={locale} />
			<span role="cell" className={NUMBER_CELL}>
				{formatDurationShort(line.seconds)}
			</span>
		</div>
	);
});

function lineRankOf(view: AppsUrlsView, index: number) {
	if (!showsLineRankIn(view)) {
		return null;
	}
	return index + 1;
}

const RankedGroup = memo(function RankedGroup({
	group,
	rank,
	isOpen,
	onOpenChange,
	locale
}: Readonly<{
	group: UsageGroup;
	rank: number | null;
	isOpen: boolean;
	onOpenChange: (key: string, isOpen: boolean) => void;
	locale: string;
}>) {
	const t = useTranslations();
	const columns = VIEW_COLUMNS[group.view];
	const handleToggle = useCallback(() => onOpenChange(group.key, !isOpen), [group.key, isOpen, onOpenChange]);

	return (
		<ReportGroup
			isOpen={isOpen}
			headerClassName={VIEW_GRIDS[group.view]}
			header={
				<>
					<span role="cell" className={cn(RANK_CELL, 'text-[13px]')}>
						{rank}
					</span>
					<span role="rowheader" className="flex min-w-0 items-center gap-2">
						<GroupToggle isOpen={isOpen} onToggle={handleToggle} className="max-w-full">
							<GroupLabel group={group} locale={locale} />
						</GroupToggle>
						<span className="shrink-0 text-xs tabular-nums text-muted-foreground max-sm:hidden">
							{groupMetaOf(group, t)}
						</span>
					</span>
					{columns.showsMember && (
						<span role="cell" className={COUNT_CELL}>
							{t('dashboard.appsUrls.MEMBER_COUNT', { count: group.memberCount })}
						</span>
					)}
					{columns.showsProject && (
						<span role="cell" className={COUNT_CELL}>
							{t('dashboard.appsUrls.PROJECT_COUNT', { count: group.projectCount })}
						</span>
					)}
					<ShareCells share={group.share} locale={locale} />
					<span role="cell" className={cn(NUMBER_CELL, 'font-medium text-foreground')}>
						{formatDurationShort(group.seconds)}
					</span>
				</>
			}
		>
			<div className="pb-1">
				{group.rows.map((line, index) => (
					<RankedLine
						key={line.key}
						line={line}
						rank={lineRankOf(group.view, index)}
						view={group.view}
						locale={locale}
					/>
				))}
			</div>
		</ReportGroup>
	);
});

function ListHeader({
	view,
	sort,
	onSort
}: Readonly<{ view: AppsUrlsView; sort: GroupSort | null; onSort: (column: GroupSortColumn) => void }>) {
	const t = useTranslations();
	const columns = VIEW_COLUMNS[view];
	return (
		<ReportHeaderRow gridClassName={VIEW_GRIDS[view]}>
			<span role="columnheader" aria-label={t('dashboard.appsUrls.COLUMN_RANK')} className="tabular-nums">
				#
			</span>
			<SortHeader label={t(FIRST_COLUMN_KEYS[view])} column="name" sort={sort} onSort={onSort} />
			{columns.showsMember && (
				<span role="columnheader" className={cn(SIDE_CELL, 'truncate')}>
					{t('dashboard.appsUrls.COLUMN_MEMBER')}
				</span>
			)}
			{columns.showsProject && (
				<span role="columnheader" className={cn(SIDE_CELL, 'truncate')}>
					{t('dashboard.appsUrls.COLUMN_PROJECT_NAME')}
				</span>
			)}
			<ShareHeader className="md:col-span-2" />
			<SortHeader
				label={t('dashboard.appsUrls.COLUMN_TIME')}
				column="time"
				sort={sort}
				onSort={onSort}
				className="justify-end"
			/>
		</ReportHeaderRow>
	);
}

function pickedNameOf(item: MosaicItem, t: ReturnType<typeof useTranslations>) {
	if (item.isOthers) {
		return t('dashboard.appsUrls.OTHER_TITLES', { count: item.titles.length });
	}
	if (item.title) {
		return item.title;
	}
	return t('dashboard.appsUrls.UNTITLED');
}

function PickedTileChip({ item, onClear }: Readonly<{ item: MosaicItem; onClear: () => void }>) {
	const t = useTranslations();
	const name = pickedNameOf(item, t);
	return (
		<span className={CHIP}>
			<span className="shrink-0 text-muted-foreground">{t('dashboard.appsUrls.COLUMN_TITLE')}:</span>
			<span className="truncate font-medium text-foreground" title={name}>
				{name}
			</span>
			<button
				type="button"
				aria-label={t('dashboard.appsUrls.REMOVE_FILTER', { name })}
				onClick={onClear}
				className={CHIP_REMOVE}
			>
				<X className="size-3" />
			</button>
		</span>
	);
}

function ListSkeletonRows({ view }: Readonly<{ view: AppsUrlsView }>) {
	const columns = VIEW_COLUMNS[view];
	return (
		<div className="hairline-divide-y divide-border" aria-hidden="true">
			{[64, 52, 58, 44, 50, 38].map((width) => (
				<div key={width} className={cn(VIEW_GRIDS[view], 'min-h-11')}>
					<span className={cn('h-2.5 w-3', SKELETON_BAR)} />
					<span className="flex min-w-0 items-center gap-2">
						<span className="size-4 shrink-0 rounded-[4px] bg-foreground/[0.06]" />
						<span className={cn('h-2.5', SKELETON_BAR)} style={{ width: `${width}%` }} />
					</span>
					{columns.showsMember && <span className={cn('h-2.5 w-20 max-md:hidden', SKELETON_BAR)} />}
					{columns.showsProject && <span className={cn('h-2.5 w-16 max-md:hidden', SKELETON_BAR)} />}
					<span className={cn('h-1 w-full max-md:hidden', SKELETON_BAR)} />
					<span className={cn('ml-auto h-2.5 w-7', SKELETON_BAR)} />
					<span className={cn('ml-auto h-2.5 w-12', SKELETON_BAR)} />
				</div>
			))}
		</div>
	);
}

function keepSort() {
	return undefined;
}

/** Drawn by the route skeleton and by the page while the report loads: one picture from the route to the rows. */
export function AppsUrlsRankedListSkeleton({
	view = 'date',
	sort = null,
	onSort = keepSort
}: Readonly<{ view?: AppsUrlsView; sort?: GroupSort | null; onSort?: (column: GroupSortColumn) => void }>) {
	const t = useTranslations();
	const title = t(LIST_TITLE_KEYS[view]);
	return (
		<DashboardSection title={title}>
			<div role="table" aria-label={title} aria-busy="true">
				<ListHeader view={view} sort={sort} onSort={onSort} />
				<ListSkeletonRows view={view} />
			</div>
		</DashboardSection>
	);
}

function rankOfGroup(ranks: ReadonlyMap<string, number>, view: AppsUrlsView, key: string) {
	if (!showsGroupRankIn(view)) {
		return null;
	}
	return ranks.get(key) ?? null;
}

export const AppsUrlsRankedList = memo(function AppsUrlsRankedList({
	view,
	groups,
	totals,
	isLoading,
	pickedItem,
	onClearPick
}: Readonly<{
	view: AppsUrlsView;
	groups: ReadonlyArray<UsageGroup>;
	totals: UsageTotals;
	isLoading: boolean;
	pickedItem: MosaicItem | null;
	onClearPick: () => void;
}>) {
	const t = useTranslations();
	const locale = useLocale();
	const [sort, setSort] = useState<GroupSort | null>(null);
	const naturalGroups = useMemo(() => sortUsageGroups(groups, view, null), [groups, view]);
	const sortedGroups = useMemo(() => sortUsageGroups(groups, view, sort), [groups, sort, view]);
	const ranks = useMemo(() => timeRanksOf(groups), [groups]);
	const { isOpen, setOpen, setAll } = useGroupDisclosure(naturalGroups);

	const handleSort = useCallback((column: GroupSortColumn) => {
		setSort((current) => nextSortOf(current, column));
	}, []);

	if (isLoading) {
		return <AppsUrlsRankedListSkeleton view={view} sort={sort} onSort={handleSort} />;
	}

	const title = t(LIST_TITLE_KEYS[view]);
	const columns = VIEW_COLUMNS[view];
	const isEveryGroupOpen = sortedGroups.every((group) => isOpen(group.key));
	const hasSeveralGroups = sortedGroups.length > 1;
	const actions = (
		<>
			{pickedItem && <PickedTileChip item={pickedItem} onClear={onClearPick} />}
			{hasSeveralGroups && (
				<DisclosureAction
					isEveryGroupOpen={isEveryGroupOpen}
					onExpandAll={() => setAll('all')}
					onCollapseAll={() => setAll('none')}
				/>
			)}
		</>
	);

	return (
		<DashboardSection title={title} actions={actions}>
			<div role="table" aria-label={title}>
				<ListHeader view={view} sort={sort} onSort={handleSort} />
				<div className="hairline-divide-y divide-border">
					{sortedGroups.map((group) => (
						<RankedGroup
							key={group.key}
							group={group}
							rank={rankOfGroup(ranks, view, group.key)}
							isOpen={isOpen(group.key)}
							onOpenChange={setOpen}
							locale={locale}
						/>
					))}
				</div>
				<ReportTotalsRow gridClassName={VIEW_GRIDS[view]}>
					<span role="cell" />
					<span role="cell" className="truncate">
						{t(GROUP_COUNT_KEYS[view], { count: sortedGroups.length })}
					</span>
					{columns.showsMember && (
						<span role="cell" className={COUNT_CELL}>
							{t('dashboard.appsUrls.MEMBER_COUNT', { count: totals.memberCount })}
						</span>
					)}
					{columns.showsProject && (
						<span role="cell" className={COUNT_CELL}>
							{t('dashboard.appsUrls.PROJECT_COUNT', { count: totals.projectCount })}
						</span>
					)}
					<span role="cell" className={METER_CELL} />
					<span role="cell" />
					<span role="cell" className={NUMBER_CELL}>
						{formatDurationShort(totals.seconds)}
					</span>
				</ReportTotalsRow>
			</div>
		</DashboardSection>
	);
});
