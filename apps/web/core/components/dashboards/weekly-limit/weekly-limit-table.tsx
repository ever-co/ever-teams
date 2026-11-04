'use client';

import { memo, useCallback, useState, type ReactNode } from 'react';
import { isSameYear } from 'date-fns';
import { type DottedLanguageObjectStringPaths, useLocale, useTranslations } from 'next-intl';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';
import { Button } from '@/core/components/duplicated-components/_button';
import { InformationCircle } from '@/core/components/icons';
import {
	DashboardSection,
	GroupToggle,
	ReportGroup,
	ReportHeaderRow,
	ReportTotalsRow
} from '@/core/components/dashboards/kit/dashboard-layout';
import { BlockEmptyMessage } from '@/core/components/dashboards/kit/dashboard-states';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { MemberCell } from '@/core/components/dashboards/kit/member-cell';
import { cn } from '@/core/lib/helpers';
import type { Period } from '@/core/lib/utils/dashboard-period';
import {
	isCurrentPeriod,
	periodLabelOf,
	type LimitDuration,
	type LimitEntry,
	type LimitGroup,
	type LimitGrouping,
	type LimitTotals
} from '@/core/lib/utils/dashboards/weekly-limit';
import { LimitShare, RemainingValue, UsedValue, VerdictCounts, VerdictText } from './limit-cells';
import {
	DESKTOP_CELL,
	LIMIT_GRID,
	LIMIT_ROW_HEIGHT,
	MOBILE_FULL_WIDTH,
	OPEN_GROUPS_BY_DEFAULT
} from './weekly-limit-grid';

const ROW_LEAD = 'min-w-0 pl-6';

const SECTION_TITLE_KEYS: Record<LimitDuration, DottedLanguageObjectStringPaths> = {
	day: 'dashboard.weeklyLimit.SECTION_DAYS',
	week: 'dashboard.weeklyLimit.SECTION_WEEKS'
};

const PERIOD_COLUMN_KEYS: Record<LimitDuration, DottedLanguageObjectStringPaths> = {
	day: 'dashboard.weeklyLimit.COLUMN_DAY',
	week: 'dashboard.weeklyLimit.COLUMN_WEEK'
};

const PERIOD_COUNT_KEYS: Record<LimitDuration, DottedLanguageObjectStringPaths> = {
	day: 'dashboard.weeklyLimit.DAYS_COUNT',
	week: 'dashboard.weeklyLimit.WEEKS_COUNT'
};

const CURRENT_PERIOD_KEYS: Record<LimitDuration, DottedLanguageObjectStringPaths> = {
	day: 'common.TODAY',
	week: 'common.THIS_WEEK'
};

const WITHOUT_TIME_KEYS: Record<LimitDuration, DottedLanguageObjectStringPaths> = {
	day: 'dashboard.weeklyLimit.DAYS_WITHOUT_TIME',
	week: 'dashboard.weeklyLimit.WEEKS_WITHOUT_TIME'
};

function sectionTitleKeyOf(grouping: LimitGrouping, duration: LimitDuration): DottedLanguageObjectStringPaths {
	if (grouping === 'member') {
		return 'dashboard.weeklyLimit.SECTION_MEMBERS';
	}
	return SECTION_TITLE_KEYS[duration];
}

function firstColumnKeyOf(grouping: LimitGrouping, duration: LimitDuration): DottedLanguageObjectStringPaths {
	if (grouping === 'member') {
		return PERIOD_COLUMN_KEYS[duration];
	}
	return 'common.MEMBER';
}

function groupCountKeyOf(grouping: LimitGrouping, duration: LimitDuration): DottedLanguageObjectStringPaths {
	if (grouping === 'member') {
		return 'dashboard.weeklyLimit.MEMBERS_COUNT';
	}
	return PERIOD_COUNT_KEYS[duration];
}

function rowCountKeyOf(grouping: LimitGrouping, duration: LimitDuration): DottedLanguageObjectStringPaths {
	if (grouping === 'member') {
		return PERIOD_COUNT_KEYS[duration];
	}
	return 'dashboard.weeklyLimit.MEMBERS_COUNT';
}

function PeriodLabel({
	periodStart,
	duration,
	className
}: Readonly<{ periodStart: Date; duration: LimitDuration; className?: string }>) {
	const t = useTranslations();
	const locale = useLocale();
	const label = periodLabelOf(periodStart, duration, locale);
	const isCurrent = isCurrentPeriod(periodStart, duration);
	return (
		<span className={cn('flex min-w-0 items-baseline gap-2', className)}>
			<span className="truncate tabular-nums">{label}</span>
			{isCurrent && (
				<span className="shrink-0 text-xs font-normal text-primary-ink">
					{t(CURRENT_PERIOD_KEYS[duration])}
				</span>
			)}
		</span>
	);
}

function standardMetaOf(entry: LimitEntry, label: string) {
	if (!entry.isStandardLimit) {
		return undefined;
	}
	return label;
}

function standardGroupMetaOf(group: LimitGroup, label: string) {
	if (!group.isStandardLimit) {
		return undefined;
	}
	return label;
}

const LimitRow = memo(function LimitRow({
	entry,
	grouping,
	duration,
	standardLimitLabel
}: Readonly<{ entry: LimitEntry; grouping: LimitGrouping; duration: LimitDuration; standardLimitLabel: string }>) {
	const isByMember = grouping === 'member';
	return (
		<div role="row" className={cn(LIMIT_GRID, LIMIT_ROW_HEIGHT)}>
			<span role="cell" className={ROW_LEAD}>
				{isByMember && (
					<PeriodLabel
						periodStart={entry.periodStart}
						duration={duration}
						className="text-[13px] text-foreground"
					/>
				)}
				{!isByMember && (
					<MemberCell
						name={entry.name}
						imageUrl={entry.imageUrl}
						meta={standardMetaOf(entry, standardLimitLabel)}
					/>
				)}
			</span>
			<span role="cell" className="flex justify-end">
				<UsedValue figure={entry} />
			</span>
			<span role="cell" className={MOBILE_FULL_WIDTH}>
				<LimitShare figure={entry} />
			</span>
			<span role="cell" className={cn('flex justify-end', DESKTOP_CELL)}>
				<RemainingValue figure={entry} />
			</span>
			<span role="cell" className={DESKTOP_CELL}>
				<VerdictText figure={entry} />
			</span>
		</div>
	);
});

function GroupName({
	group,
	duration,
	standardLimitLabel
}: Readonly<{ group: LimitGroup; duration: LimitDuration; standardLimitLabel: string }>) {
	const member = group.member;
	const periodStart = group.periodStart;
	if (member) {
		const meta = standardGroupMetaOf(group, standardLimitLabel);
		return <MemberCell name={member.name} imageUrl={member.imageUrl} meta={meta} />;
	}
	if (periodStart) {
		return <PeriodLabel periodStart={periodStart} duration={duration} />;
	}
	return null;
}

const LimitGroupBlock = memo(function LimitGroupBlock({
	group,
	grouping,
	duration,
	isOpen,
	onToggle,
	standardLimitLabel
}: Readonly<{
	group: LimitGroup;
	grouping: LimitGrouping;
	duration: LimitDuration;
	isOpen: boolean;
	onToggle: (key: string, wasOpen: boolean) => void;
	standardLimitLabel: string;
}>) {
	const t = useTranslations();
	const rowCount = group.entries.length;
	const rowCountLabel = t(rowCountKeyOf(grouping, duration), { count: rowCount });
	const handleToggle = useCallback(() => onToggle(group.key, isOpen), [group.key, isOpen, onToggle]);
	const hasOver = group.totals.overCount > 0;
	const hasNear = group.totals.nearCount > 0;
	const hasVerdictCounts = hasOver || hasNear;

	const header = (
		<>
			<span role="cell" className="flex min-w-0 items-center gap-2">
				<GroupToggle isOpen={isOpen} onToggle={handleToggle} className="min-w-0">
					<GroupName group={group} duration={duration} standardLimitLabel={standardLimitLabel} />
				</GroupToggle>
				<span className="shrink-0 text-xs tabular-nums text-muted-foreground max-sm:hidden">
					{rowCountLabel}
				</span>
			</span>
			<span role="cell" className="flex justify-end">
				<UsedValue figure={group.totals} />
			</span>
			<span role="cell" className={DESKTOP_CELL} />
			<span role="cell" className={DESKTOP_CELL} />
			{hasVerdictCounts && (
				<span role="cell" className={cn('min-w-0', MOBILE_FULL_WIDTH, 'max-md:pl-6')}>
					<VerdictCounts overCount={group.totals.overCount} nearCount={group.totals.nearCount} />
				</span>
			)}
		</>
	);

	return (
		<ReportGroup isOpen={isOpen} header={header} headerClassName={LIMIT_GRID}>
			<div className="hairline-divide-y divide-border">
				{group.entries.map((entry) => (
					<LimitRow
						key={entry.key}
						entry={entry}
						grouping={grouping}
						duration={duration}
						standardLimitLabel={standardLimitLabel}
					/>
				))}
			</div>
		</ReportGroup>
	);
});

function UsedColumnLabel() {
	const t = useTranslations();
	const label = t('dashboard.weeklyLimit.COLUMN_USED');
	return (
		<Tooltip>
			<TooltipTrigger
				delay={400}
				render={
					<button
						type="button"
						className="-mx-1 inline-flex items-center gap-1 rounded-sm px-1 text-right outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25"
					/>
				}
			>
				<span>{label}</span>
				<InformationCircle aria-hidden="true" className="size-3.5" />
			</TooltipTrigger>
			<TooltipContent className="max-w-72">{t('dashboard.weeklyLimit.COLUMN_USED_HINT')}</TooltipContent>
		</Tooltip>
	);
}

function TableHeader({ grouping, duration }: Readonly<{ grouping: LimitGrouping; duration: LimitDuration }>) {
	const t = useTranslations();
	return (
		<ReportHeaderRow gridClassName={LIMIT_GRID}>
			<span role="columnheader" className={ROW_LEAD}>
				{t(firstColumnKeyOf(grouping, duration))}
			</span>
			<span role="columnheader" className="flex justify-end">
				<UsedColumnLabel />
			</span>
			<span role="columnheader" className={DESKTOP_CELL}>
				{t('dashboard.weeklyLimit.LIMIT_USED')}
			</span>
			<span role="columnheader" className={cn('text-right', DESKTOP_CELL)}>
				{t('pages.timeLimitReport.REMAINING')}
			</span>
			<span role="columnheader" className={DESKTOP_CELL}>
				{t('common.STATUS')}
			</span>
		</ReportHeaderRow>
	);
}

function TotalsRow({ totals, countLabel }: Readonly<{ totals: LimitTotals; countLabel: string }>) {
	const t = useTranslations();
	return (
		<ReportTotalsRow gridClassName={LIMIT_GRID}>
			<span role="cell" className="flex min-w-0 items-baseline gap-2">
				<span>{t('common.TOTAL')}</span>
				<span className="truncate text-xs font-normal tabular-nums text-muted-foreground">{countLabel}</span>
			</span>
			<span role="cell" className="flex justify-end">
				<UsedValue figure={totals} />
			</span>
			<span role="cell" className={MOBILE_FULL_WIDTH}>
				<LimitShare figure={totals} />
			</span>
			<span role="cell" className={cn('flex justify-end', DESKTOP_CELL)}>
				<RemainingValue figure={totals} />
			</span>
			<span role="cell" className={DESKTOP_CELL}>
				<VerdictText figure={totals} />
			</span>
		</ReportTotalsRow>
	);
}

function isGroupOpen(overrides: Readonly<Record<string, boolean>>, key: string, index: number) {
	const override = overrides[key];
	if (typeof override === 'boolean') {
		return override;
	}
	return index < OPEN_GROUPS_BY_DEFAULT;
}

function allGroupsOpen(groups: ReadonlyArray<LimitGroup>, overrides: Readonly<Record<string, boolean>>) {
	return groups.every((group, index) => isGroupOpen(overrides, group.key, index));
}

function useGroupOpenState() {
	const [overrides, setOverrides] = useState<Record<string, boolean>>({});

	const toggle = useCallback((key: string, wasOpen: boolean) => {
		setOverrides((current) => ({ ...current, [key]: !wasOpen }));
	}, []);

	const setAll = useCallback((keys: ReadonlyArray<string>, isOpen: boolean) => {
		const next: Record<string, boolean> = {};
		for (const key of keys) {
			next[key] = isOpen;
		}
		setOverrides(next);
	}, []);

	return { overrides, toggle, setAll };
}

export interface WeeklyLimitTableProps {
	groups: ReadonlyArray<LimitGroup>;
	grouping: LimitGrouping;
	duration: LimitDuration;
	totals: LimitTotals | null;
	emptyPeriodCount: number;
	membersWithoutTimeCount: number;
	isLoading: boolean;
	isUpdating: boolean;
	empty: ReactNode;
}

/** Drawn by the route skeleton and by the page while the report loads: one picture from the route to the rows. */
export function WeeklyLimitTableSkeleton({
	grouping = 'period',
	duration = 'day'
}: Readonly<{ grouping?: LimitGrouping; duration?: LimitDuration }>) {
	const t = useTranslations();
	const title = t(sectionTitleKeyOf(grouping, duration));
	return (
		<DashboardSection title={title} ariaLabel={title}>
			<div role="table" aria-busy="true">
				<TableHeader grouping={grouping} duration={duration} />
				<LimitRowsSkeleton />
			</div>
		</DashboardSection>
	);
}

export function WeeklyLimitTable({
	groups,
	grouping,
	duration,
	totals,
	emptyPeriodCount,
	membersWithoutTimeCount,
	isLoading,
	isUpdating,
	empty
}: Readonly<WeeklyLimitTableProps>) {
	const t = useTranslations();
	const { overrides, toggle, setAll } = useGroupOpenState();
	const hasGroups = groups.length > 0;
	const canToggleAll = groups.length > 1;
	const areAllOpen = allGroupsOpen(groups, overrides);
	const showsWithoutTime = grouping === 'period' && emptyPeriodCount > 0;
	const showsMembersWithoutTime = membersWithoutTimeCount > 0;
	const showsBothNotes = showsWithoutTime && showsMembersWithoutTime;
	const showsFooterNote = showsWithoutTime || showsMembersWithoutTime;
	const showsRows = hasGroups && !isLoading;
	const showsEmpty = !hasGroups && !isLoading;
	const standardLimitLabel = t('dashboard.weeklyLimit.STANDARD_LIMIT');
	const groupCountLabel = t(groupCountKeyOf(grouping, duration), { count: groups.length });

	const toggleAll = () => {
		const keys = groups.map((group) => group.key);
		setAll(keys, !areAllOpen);
	};
	const toggleAllLabel = toggleAllLabelOf(areAllOpen, t);

	if (isLoading) {
		return <WeeklyLimitTableSkeleton grouping={grouping} duration={duration} />;
	}

	const actions = canToggleAll && (
		<Button type="button" variant="ghost" size="sm" onClick={toggleAll}>
			{toggleAllLabel}
		</Button>
	);

	return (
		<DashboardSection
			title={t(sectionTitleKeyOf(grouping, duration))}
			actions={actions}
			ariaLabel={t(sectionTitleKeyOf(grouping, duration))}
		>
			<div role="table" aria-busy={isUpdating}>
				<TableHeader grouping={grouping} duration={duration} />
				{showsEmpty && empty}
				{showsRows && (
					<div className="hairline-divide-y divide-border">
						{groups.map((group, index) => (
							<LimitGroupBlock
								key={group.key}
								group={group}
								grouping={grouping}
								duration={duration}
								isOpen={isGroupOpen(overrides, group.key, index)}
								onToggle={toggle}
								standardLimitLabel={standardLimitLabel}
							/>
						))}
					</div>
				)}
				{showsRows && showsFooterNote && (
					<div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 px-4 py-2.5 text-xs text-muted-foreground hairline-t border-dashed border-border">
						{showsWithoutTime && <p>{t(WITHOUT_TIME_KEYS[duration], { count: emptyPeriodCount })}</p>}
						{showsBothNotes && <span aria-hidden="true">·</span>}
						{showsMembersWithoutTime && (
							<p>{t('dashboard.weeklyLimit.MEMBERS_WITHOUT_TIME', { count: membersWithoutTimeCount })}</p>
						)}
					</div>
				)}
				{showsRows && totals && <TotalsRow totals={totals} countLabel={groupCountLabel} />}
			</div>
		</DashboardSection>
	);
}

function toggleAllLabelOf(areAllOpen: boolean, t: ReturnType<typeof useTranslations>) {
	if (areAllOpen) {
		return t('dashboard.weeklyLimit.COLLAPSE_ALL');
	}
	return t('dashboard.weeklyLimit.EXPAND_ALL');
}

export function WeeklyLimitEmpty({
	period,
	isFiltered,
	onClearFilters,
	onPreviousPeriod
}: Readonly<{ period: Period; isFiltered: boolean; onClearFilters: () => void; onPreviousPeriod: () => void }>) {
	const t = useTranslations();
	const locale = useLocale();
	const title = emptyTitleOf(period, locale, t);
	if (isFiltered) {
		return (
			<BlockEmptyMessage
				title={title}
				message={t('dashboard.weeklyLimit.EMPTY_FILTERED_MESSAGE')}
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
			title={title}
			message={t('dashboard.weeklyLimit.EMPTY_MESSAGE')}
			action={
				<Button type="button" variant="outline" size="default" onClick={onPreviousPeriod}>
					{t('dashboard.period.PREVIOUS')}
				</Button>
			}
		/>
	);
}

function emptyDayFormatOf(period: Period): Intl.DateTimeFormatOptions {
	const isCurrentYear = isSameYear(period.from, new Date());
	const isOneYear = isSameYear(period.from, period.to);
	const showsYear = !isCurrentYear || !isOneYear;
	if (showsYear) {
		return { month: 'short', day: 'numeric', year: 'numeric' };
	}
	return { month: 'short', day: 'numeric' };
}

function emptyTitleOf(period: Period, locale: string, t: ReturnType<typeof useTranslations>) {
	const formatter = new Intl.DateTimeFormat(locale, emptyDayFormatOf(period));
	const from = formatter.format(period.from);
	const to = formatter.format(period.to);
	const isOneDay = from === to;
	if (isOneDay) {
		return t('dashboard.weeklyLimit.EMPTY_DAY', { day: from });
	}
	return t('dashboard.weeklyLimit.EMPTY_RANGE', { from, to });
}

const SKELETON_ROWS = [80, 68, 74, 56, 62, 48];

function LimitRowsSkeleton() {
	return (
		<div className="hairline-divide-y divide-border" aria-hidden="true">
			{SKELETON_ROWS.map((nameWidth, index) => (
				<div key={index} className={cn(LIMIT_GRID, 'min-h-11')}>
					<span className={cn(ROW_LEAD, 'flex items-center gap-2.5')}>
						<span className="size-6 shrink-0 rounded-full bg-foreground/6" />
						<span className={cn('h-2.5', SKELETON_BAR)} style={{ width: `${nameWidth}%` }} />
					</span>
					<span className={cn('ml-auto h-2.5 w-20', SKELETON_BAR)} />
					<span className={cn('flex items-center gap-3', MOBILE_FULL_WIDTH)}>
						<span className="h-3 min-w-16 flex-1 rounded-[2px] bg-foreground/5" />
						<span className={cn('h-2.5 w-8', SKELETON_BAR)} />
					</span>
					<span className={cn('ml-auto h-2.5 w-14', SKELETON_BAR, DESKTOP_CELL)} />
					<span className={cn('h-2.5 w-16', SKELETON_BAR, DESKTOP_CELL)} />
				</div>
			))}
		</div>
	);
}
