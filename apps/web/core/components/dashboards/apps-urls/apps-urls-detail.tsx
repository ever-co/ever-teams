'use client';

import { memo, useCallback, useMemo, useState, type ReactNode } from 'react';
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
import { cn } from '@/core/lib/helpers';
import { formatDurationShort, formatPercent } from '@/core/lib/utils/dashboard-figures';
import {
	formatDayLabel,
	sortUsageGroups,
	VIEW_COLUMNS,
	type AppsUrlsView,
	type GroupSort,
	type GroupSortColumn,
	type UsageGroup,
	type UsageGroupRow
} from '@/core/lib/utils/dashboards/apps-urls';
import { AppTitleCell, PersonCell, ProjectCell } from './usage-cells';
import { DisclosureAction, nextSortOf, ShareHeader, SortHeader, useGroupDisclosure } from './apps-urls-list-controls';

const FULL_GRID =
	'grid grid-cols-[minmax(0,1fr)_4.75rem_2.75rem] items-center gap-x-3 px-4 md:grid-cols-[minmax(0,1fr)_minmax(0,11rem)_minmax(0,10rem)_5rem_7.5rem]';

const SINGLE_GRID =
	'grid grid-cols-[minmax(0,1fr)_4.75rem_2.75rem] items-center gap-x-3 px-4 md:grid-cols-[minmax(0,1fr)_minmax(0,13rem)_5rem_7.5rem]';

const VIEW_GRIDS: Record<AppsUrlsView, string> = {
	date: FULL_GRID,
	employee: SINGLE_GRID,
	project: SINGLE_GRID,
	application: FULL_GRID
};

const DETAIL_TITLE_KEYS: Record<AppsUrlsView, DottedLanguageObjectStringPaths> = {
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

const COUNT_CELL = 'truncate text-xs tabular-nums text-muted-foreground max-md:hidden';

const SIDE_CELL = 'min-w-0 max-md:hidden';

/** A thin guide under the group's chevron ties its rows to it, as a tree does. */
const LEAD_CELL =
	'relative min-w-0 pl-6 before:absolute before:inset-y-0 before:left-2 before:w-(--hairline) before:bg-border';

const LINE_ROW = 'min-h-9 py-1 [contain-intrinsic-size:auto_2.25rem] [content-visibility:auto]';

function groupMetaCountOf(group: UsageGroup) {
	if (group.view === 'application') {
		return group.dayCount;
	}
	return group.titleCount;
}

function groupMetaKeyOf(group: UsageGroup): DottedLanguageObjectStringPaths {
	if (group.view === 'application') {
		return 'dashboard.appsUrls.DAY_COUNT';
	}
	return 'dashboard.appsUrls.TITLE_COUNT';
}

function ShareCell({ share }: Readonly<{ share: number }>) {
	return (
		<span role="cell" className="flex items-center justify-end gap-2">
			<ShareMeter share={share} className="w-14 max-md:hidden" />
			<span className="w-9 text-right text-[13px] tabular-nums text-muted-foreground">
				{formatPercent(share)}
			</span>
		</span>
	);
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
			return <AppTitleCell title={group.sample.title} kind={group.sample.kind} url={group.sample.url} />;
	}
}

function LineLead({ line, view, locale }: Readonly<{ line: UsageGroupRow; view: AppsUrlsView; locale: string }>) {
	if (view === 'application') {
		return (
			<span className="block truncate text-[13px] text-foreground">{formatDayLabel(line.dateKey, locale)}</span>
		);
	}
	return <AppTitleCell title={line.title} kind={line.kind} url={line.url} />;
}

const UsageLine = memo(function UsageLine({
	line,
	view,
	locale
}: Readonly<{ line: UsageGroupRow; view: AppsUrlsView; locale: string }>) {
	const columns = VIEW_COLUMNS[view];
	return (
		<div role="row" className={cn(VIEW_GRIDS[view], LINE_ROW)}>
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
			<span role="cell" className={NUMBER_CELL}>
				{formatDurationShort(line.seconds)}
			</span>
			<ShareCell share={line.share} />
		</div>
	);
});

const UsageGroupBlock = memo(function UsageGroupBlock({
	group,
	isOpen,
	onOpenChange,
	locale
}: Readonly<{
	group: UsageGroup;
	isOpen: boolean;
	onOpenChange: (key: string, isOpen: boolean) => void;
	locale: string;
}>) {
	const t = useTranslations();
	const columns = VIEW_COLUMNS[group.view];
	const handleToggle = useCallback(() => onOpenChange(group.key, !isOpen), [group.key, isOpen, onOpenChange]);
	const meta = t(groupMetaKeyOf(group), { count: groupMetaCountOf(group) });

	return (
		<ReportGroup
			isOpen={isOpen}
			headerClassName={VIEW_GRIDS[group.view]}
			header={
				<>
					<span role="rowheader" className="flex min-w-0 items-center gap-2">
						<GroupToggle isOpen={isOpen} onToggle={handleToggle} className="max-w-full">
							<GroupLabel group={group} locale={locale} />
						</GroupToggle>
						<span className="shrink-0 text-xs tabular-nums text-muted-foreground max-sm:hidden">
							{meta}
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
					<span role="cell" className={cn(NUMBER_CELL, 'font-medium text-foreground')}>
						{formatDurationShort(group.seconds)}
					</span>
					<ShareCell share={group.share} />
				</>
			}
		>
			<div className="pb-1">
				{group.rows.map((line) => (
					<UsageLine key={line.key} line={line} view={group.view} locale={locale} />
				))}
			</div>
		</ReportGroup>
	);
});

function DetailSkeleton({ view }: Readonly<{ view: AppsUrlsView }>) {
	const columns = VIEW_COLUMNS[view];
	return (
		<div className="hairline-divide-y divide-border" aria-hidden="true">
			{[64, 52, 58, 44, 50, 38].map((width) => (
				<div key={width} className={cn(VIEW_GRIDS[view], 'min-h-11')}>
					<span className="flex min-w-0 items-center gap-2">
						<span className="size-4 shrink-0 rounded-[4px] bg-foreground/[0.06]" />
						<span className={cn('h-2.5', SKELETON_BAR)} style={{ width: `${width}%` }} />
					</span>
					{columns.showsMember && <span className={cn('h-2.5 w-20 max-md:hidden', SKELETON_BAR)} />}
					{columns.showsProject && <span className={cn('h-2.5 w-16 max-md:hidden', SKELETON_BAR)} />}
					<span className={cn('ml-auto h-2.5 w-12', SKELETON_BAR)} />
					<span className={cn('ml-auto h-2.5 w-9', SKELETON_BAR)} />
				</div>
			))}
		</div>
	);
}

function DetailHeader({
	view,
	sort,
	onSort
}: Readonly<{ view: AppsUrlsView; sort: GroupSort | null; onSort: (column: GroupSortColumn) => void }>) {
	const t = useTranslations();
	const columns = VIEW_COLUMNS[view];
	return (
		<ReportHeaderRow gridClassName={VIEW_GRIDS[view]}>
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
			<SortHeader
				label={t('dashboard.appsUrls.COLUMN_TIME')}
				column="time"
				sort={sort}
				onSort={onSort}
				className="justify-end"
			/>
			<ShareHeader />
		</ReportHeaderRow>
	);
}

function keepSort() {
	return undefined;
}

/** Drawn by the route skeleton and by the page while the report loads: one picture from the route to the rows. */
export function AppsUrlsDetailSkeleton({
	view = 'date',
	sort = null,
	onSort = keepSort
}: Readonly<{ view?: AppsUrlsView; sort?: GroupSort | null; onSort?: (column: GroupSortColumn) => void }>) {
	const t = useTranslations();
	const title = t(DETAIL_TITLE_KEYS[view]);
	return (
		<DashboardSection title={title}>
			<div role="table" aria-label={title} aria-busy="true">
				<DetailHeader view={view} sort={sort} onSort={onSort} />
				<DetailSkeleton view={view} />
			</div>
		</DashboardSection>
	);
}

export interface DetailTotals {
	seconds: number;
	memberCount: number;
	projectCount: number;
}

/**
 * The rows that make up the period, grouped by the picked view. Each group opens in place and its header carries
 * its own totals (time, share of the period, members, projects); rows give their share of the group. Days read
 * newest first, everything else longest first, until a column header is clicked.
 */
export const AppsUrlsDetail = memo(function AppsUrlsDetail({
	view,
	groups,
	totals,
	isLoading,
	emptyState
}: Readonly<{
	view: AppsUrlsView;
	groups: ReadonlyArray<UsageGroup>;
	totals: DetailTotals;
	isLoading: boolean;
	emptyState: ReactNode;
}>) {
	const t = useTranslations();
	const locale = useLocale();
	const [sort, setSort] = useState<GroupSort | null>(null);
	const naturalGroups = useMemo(() => sortUsageGroups(groups, view, null), [groups, view]);
	const sortedGroups = useMemo(() => sortUsageGroups(groups, view, sort), [groups, sort, view]);
	const { isOpen, setOpen, setAll } = useGroupDisclosure(naturalGroups);

	const handleSort = useCallback((column: GroupSortColumn) => {
		setSort((current) => nextSortOf(current, column));
	}, []);

	const columns = VIEW_COLUMNS[view];
	const hasGroups = sortedGroups.length > 0;
	const showsGroups = hasGroups;
	const showsEmpty = !hasGroups;
	const isEveryGroupOpen = sortedGroups.every((group) => isOpen(group.key));
	const showsDisclosureAction = showsGroups && sortedGroups.length > 1;

	if (isLoading) {
		return <AppsUrlsDetailSkeleton view={view} sort={sort} onSort={handleSort} />;
	}

	const disclosureAction = (
		<DisclosureAction
			isEveryGroupOpen={isEveryGroupOpen}
			onExpandAll={() => setAll('all')}
			onCollapseAll={() => setAll('none')}
		/>
	);

	return (
		<DashboardSection title={t(DETAIL_TITLE_KEYS[view])} actions={showsDisclosureAction && disclosureAction}>
			<div role="table" aria-label={t(DETAIL_TITLE_KEYS[view])}>
				<DetailHeader view={view} sort={sort} onSort={handleSort} />
				{showsEmpty && (
					<div role="row">
						<div role="cell">{emptyState}</div>
					</div>
				)}
				{showsGroups && (
					<>
						<div className="hairline-divide-y divide-border">
							{sortedGroups.map((group) => (
								<UsageGroupBlock
									key={group.key}
									group={group}
									isOpen={isOpen(group.key)}
									onOpenChange={setOpen}
									locale={locale}
								/>
							))}
						</div>
						<ReportTotalsRow gridClassName={VIEW_GRIDS[view]}>
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
							<span role="cell" className={NUMBER_CELL}>
								{formatDurationShort(totals.seconds)}
							</span>
							<span role="cell" />
						</ReportTotalsRow>
					</>
				)}
			</div>
		</DashboardSection>
	);
});
