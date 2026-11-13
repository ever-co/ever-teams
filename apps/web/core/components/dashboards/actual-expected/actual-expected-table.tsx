'use client';

import { memo, type ReactNode, useCallback, useState } from 'react';
import { isSameYear } from 'date-fns';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
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
import { MemberCell } from '@/core/components/dashboards/kit/member-cell';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { cn } from '@/core/lib/helpers';
import type { Period } from '@/core/lib/utils/dashboard-period';
import type { MemberDay, PlanGroup, PlanGrouping, PlanTotals } from '@/core/lib/utils/dashboards/actual-expected';
import { useWorkspaceLocale } from '@/core/hooks/common/use-workspace-locale';
import { dateFormatOf, type FormatLocale } from '@/core/lib/utils/workspace-formats';
import {
	DESKTOP_CELL,
	DIFFERENCE_CELL,
	LEAD_CELL,
	METER_CELL,
	MOBILE_REACHED_CELL,
	OPEN_DAY_GROUPS_BY_DEFAULT,
	PLAN_GRID,
	PLAN_ROW_HEIGHT
} from './actual-expected-grid';
import {
	ActualValue,
	DayExpectedValue,
	DayLabel,
	DifferenceValue,
	figureOfDay,
	figureOfTotals,
	ReachedCell,
	ReachedValue,
	SOURCE_LABEL_KEYS,
	TotalExpectedValue,
	UnplannedDaysValue
} from './plan-cells';

const ROW_LEAD = 'pl-6';

type Translate = ReturnType<typeof useTranslations>;

const SECTION_TITLE_KEYS: Record<PlanGrouping, DottedLanguageObjectStringPaths> = {
	member: 'dashboard.weeklyLimit.SECTION_MEMBERS',
	day: 'dashboard.weeklyLimit.SECTION_DAYS'
};

const FIRST_COLUMN_KEYS: Record<PlanGrouping, DottedLanguageObjectStringPaths> = {
	member: 'common.MEMBER',
	day: 'dashboard.weeklyLimit.COLUMN_DAY'
};

const GROUP_COUNT_KEYS: Record<PlanGrouping, DottedLanguageObjectStringPaths> = {
	member: 'dashboard.weeklyLimit.MEMBERS_COUNT',
	day: 'dashboard.weeklyLimit.DAYS_COUNT'
};

const ROW_COUNT_KEYS: Record<PlanGrouping, DottedLanguageObjectStringPaths> = {
	member: 'dashboard.weeklyLimit.DAYS_COUNT',
	day: 'dashboard.weeklyLimit.MEMBERS_COUNT'
};

/** On phones the expected column is hidden, so the plan's state rides under the row's name. */
function MobileSourceNote({ memberDay }: Readonly<{ memberDay: MemberDay }>) {
	const t = useTranslations();
	const isPlannedHours = memberDay.source === 'planned';
	if (isPlannedHours) {
		return null;
	}
	return (
		<span className="block truncate text-xs text-muted-foreground md:hidden">
			{t(SOURCE_LABEL_KEYS[memberDay.source])}
		</span>
	);
}

function RowLead({ memberDay, grouping }: Readonly<{ memberDay: MemberDay; grouping: PlanGrouping }>) {
	const isByMember = grouping === 'member';
	if (isByMember) {
		return (
			<span className="flex min-w-0 flex-col">
				<DayLabel day={memberDay.day} dayKey={memberDay.dayKey} />
				<MobileSourceNote memberDay={memberDay} />
			</span>
		);
	}
	return (
		<span className="flex min-w-0 flex-col">
			<MemberCell name={memberDay.name} imageUrl={memberDay.imageUrl} />
			<MobileSourceNote memberDay={memberDay} />
		</span>
	);
}

const PlanRow = memo(function PlanRow({
	memberDay,
	grouping
}: Readonly<{ memberDay: MemberDay; grouping: PlanGrouping }>) {
	const figure = figureOfDay(memberDay);
	return (
		<div role="row" className={cn(PLAN_GRID, PLAN_ROW_HEIGHT)}>
			<span role="cell" className={cn(LEAD_CELL, ROW_LEAD)}>
				<RowLead memberDay={memberDay} grouping={grouping} />
			</span>
			<span role="cell" className={MOBILE_REACHED_CELL}>
				<ReachedValue figure={figure} />
			</span>
			<span role="cell" className={cn('flex justify-end', DESKTOP_CELL)}>
				<DayExpectedValue memberDay={memberDay} />
			</span>
			<span role="cell" className={cn('flex justify-end', DESKTOP_CELL)}>
				<ActualValue actual={memberDay.actual} />
			</span>
			<span role="cell" className={DIFFERENCE_CELL}>
				<DifferenceValue figure={figure} />
			</span>
			<span role="cell" className={METER_CELL}>
				<ReachedCell figure={figure} />
			</span>
			<span role="cell" className={DESKTOP_CELL} />
		</div>
	);
});

function TotalsCells({ totals }: Readonly<{ totals: PlanTotals }>) {
	const figure = figureOfTotals(totals);
	return (
		<>
			<span role="cell" className={MOBILE_REACHED_CELL}>
				<ReachedValue figure={figure} />
			</span>
			<span role="cell" className={cn('flex justify-end', DESKTOP_CELL)}>
				<TotalExpectedValue totals={totals} />
			</span>
			<span role="cell" className={cn('flex justify-end', DESKTOP_CELL)}>
				<ActualValue actual={totals.actual} />
			</span>
			<span role="cell" className={DIFFERENCE_CELL}>
				<DifferenceValue figure={figure} />
			</span>
			<span role="cell" className={METER_CELL}>
				<ReachedCell figure={figure} />
			</span>
			<span role="cell" className={cn('flex justify-end', DESKTOP_CELL)}>
				<UnplannedDaysValue count={totals.unplannedDays} />
			</span>
		</>
	);
}

function GroupName({ group }: Readonly<{ group: PlanGroup }>) {
	const member = group.member;
	const day = group.day;
	if (member) {
		return <MemberCell name={member.name} imageUrl={member.imageUrl} />;
	}
	if (day) {
		return <DayLabel day={day} dayKey={group.key} />;
	}
	return null;
}

/** A member with nothing planned or tracked keeps their row, without a disclosure that would open on nothing. */
function EmptyGroupRow({ group }: Readonly<{ group: PlanGroup }>) {
	return (
		<div role="row" className={cn(PLAN_GRID, PLAN_ROW_HEIGHT)}>
			<span role="cell" className={cn(LEAD_CELL, ROW_LEAD)}>
				<GroupName group={group} />
			</span>
			<TotalsCells totals={group.totals} />
		</div>
	);
}

const PlanGroupBlock = memo(function PlanGroupBlock({
	group,
	grouping,
	isOpen,
	onToggle
}: Readonly<{
	group: PlanGroup;
	grouping: PlanGrouping;
	isOpen: boolean;
	onToggle: (key: string, wasOpen: boolean) => void;
}>) {
	const t = useTranslations();
	const rowCount = group.rows.length;
	const rowCountLabel = t(ROW_COUNT_KEYS[grouping], { count: rowCount });
	const handleToggle = useCallback(() => onToggle(group.key, isOpen), [group.key, isOpen, onToggle]);
	const hasRows = rowCount > 0;

	if (!hasRows) {
		return <EmptyGroupRow group={group} />;
	}

	const header = (
		<>
			<span role="cell" className={cn(LEAD_CELL, 'flex items-center gap-2')}>
				<GroupToggle isOpen={isOpen} onToggle={handleToggle} className="min-w-0">
					<GroupName group={group} />
				</GroupToggle>
				<span className="shrink-0 text-xs tabular-nums text-muted-foreground max-sm:hidden">
					{rowCountLabel}
				</span>
			</span>
			<TotalsCells totals={group.totals} />
		</>
	);

	return (
		<ReportGroup isOpen={isOpen} header={header} headerClassName={PLAN_GRID}>
			<div className="hairline-divide-y divide-border">
				{group.rows.map((memberDay) => (
					<PlanRow key={memberDay.key} memberDay={memberDay} grouping={grouping} />
				))}
			</div>
		</ReportGroup>
	);
});

function ColumnHint({ label, hint, className }: Readonly<{ label: string; hint: string; className?: string }>) {
	return (
		<Tooltip>
			<TooltipTrigger
				delay={400}
				render={
					<button
						type="button"
						className={cn(
							'-mx-1 inline-flex items-center gap-1 rounded-sm px-1 outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25',
							className
						)}
					/>
				}
			>
				<span>{label}</span>
				<InformationCircle aria-hidden="true" className="size-3.5" />
			</TooltipTrigger>
			<TooltipContent className="max-w-72">{hint}</TooltipContent>
		</Tooltip>
	);
}

function TableHeader({ grouping }: Readonly<{ grouping: PlanGrouping }>) {
	const t = useTranslations();
	return (
		<ReportHeaderRow gridClassName={PLAN_GRID}>
			<span role="columnheader" className={cn(LEAD_CELL, ROW_LEAD)}>
				{t(FIRST_COLUMN_KEYS[grouping])}
			</span>
			<span role="columnheader" className={cn(MOBILE_REACHED_CELL, 'text-right')}>
				{t('dashboard.actualExpected.COLUMN_ACTUAL_OF_EXPECTED')}
			</span>
			<span role="columnheader" className={cn('flex justify-end', DESKTOP_CELL)}>
				<ColumnHint
					label={t('dashboard.actualExpected.EXPECTED')}
					hint={t('dashboard.actualExpected.COLUMN_EXPECTED_HINT')}
					className="text-right"
				/>
			</span>
			<span role="columnheader" className={cn('text-right', DESKTOP_CELL)}>
				{t('dashboard.actualExpected.ACTUAL')}
			</span>
			<span role="columnheader" className={cn('text-right', DESKTOP_CELL)}>
				{t('dashboard.actualExpected.COLUMN_DIFFERENCE')}
			</span>
			<span role="columnheader" className={DESKTOP_CELL}>
				{t('dashboard.actualExpected.COLUMN_REACHED')}
			</span>
			<span role="columnheader" className={cn('flex justify-end', DESKTOP_CELL)}>
				<ColumnHint
					label={t('dashboard.actualExpected.COLUMN_UNPLANNED')}
					hint={t('dashboard.actualExpected.COLUMN_UNPLANNED_HINT')}
					className="text-right"
				/>
			</span>
		</ReportHeaderRow>
	);
}

function TotalsRow({ totals, countLabel }: Readonly<{ totals: PlanTotals; countLabel: string }>) {
	const t = useTranslations();
	return (
		<ReportTotalsRow gridClassName={PLAN_GRID}>
			<span role="cell" className={cn(LEAD_CELL, ROW_LEAD, 'flex items-baseline gap-2')}>
				<span>{t('common.TOTAL')}</span>
				<span className="truncate text-xs font-normal tabular-nums text-muted-foreground">{countLabel}</span>
			</span>
			<TotalsCells totals={totals} />
		</ReportTotalsRow>
	);
}

function defaultOpenOf(grouping: PlanGrouping, index: number) {
	if (grouping === 'member') {
		return false;
	}
	return index < OPEN_DAY_GROUPS_BY_DEFAULT;
}

function isGroupOpen(overrides: Readonly<Record<string, boolean>>, key: string, index: number, grouping: PlanGrouping) {
	const override = overrides[key];
	if (typeof override === 'boolean') {
		return override;
	}
	return defaultOpenOf(grouping, index);
}

function openableGroupsOf(groups: ReadonlyArray<PlanGroup>) {
	return groups.filter((group) => group.rows.length > 0);
}

function allGroupsOpen(
	groups: ReadonlyArray<PlanGroup>,
	overrides: Readonly<Record<string, boolean>>,
	grouping: PlanGrouping
) {
	return groups.every((group, index) => isGroupOpen(overrides, group.key, index, grouping));
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

function toggleAllLabelOf(areAllOpen: boolean, t: Translate) {
	if (areAllOpen) {
		return t('dashboard.weeklyLimit.COLLAPSE_ALL');
	}
	return t('dashboard.weeklyLimit.EXPAND_ALL');
}

const SKELETON_ROWS = [78, 64, 72, 54, 60, 46];

function PlanRowsSkeleton() {
	return (
		<div className="hairline-divide-y divide-border" aria-hidden="true">
			{SKELETON_ROWS.map((nameWidth, index) => (
				<div key={index} className={cn(PLAN_GRID, 'min-h-11')}>
					<span className={cn(LEAD_CELL, ROW_LEAD, 'flex items-center gap-2.5')}>
						<span className="size-6 shrink-0 rounded-full bg-foreground/6" />
						<span className={cn('h-2.5', SKELETON_BAR)} style={{ width: `${nameWidth}%` }} />
					</span>
					<span className={cn('ml-auto h-2.5 w-20', SKELETON_BAR, MOBILE_REACHED_CELL)} />
					<span className={cn('ml-auto h-2.5 w-10', SKELETON_BAR, DESKTOP_CELL)} />
					<span className={cn('ml-auto h-2.5 w-14', SKELETON_BAR, DESKTOP_CELL)} />
					<span className={cn('ml-auto h-2.5 w-12', SKELETON_BAR, DIFFERENCE_CELL)} />
					<span className={cn('flex items-center gap-3', METER_CELL)}>
						<span className="h-3 min-w-16 flex-1 rounded-[2px] bg-foreground/5" />
						<span className={cn('h-2.5 w-8', SKELETON_BAR)} />
					</span>
					<span className={cn('ml-auto h-2.5 w-6', SKELETON_BAR, DESKTOP_CELL)} />
				</div>
			))}
		</div>
	);
}

export function ActualExpectedTableSkeleton({ grouping = 'member' }: Readonly<{ grouping?: PlanGrouping }>) {
	const t = useTranslations();
	const title = t(SECTION_TITLE_KEYS[grouping]);
	return (
		<DashboardSection title={title} ariaLabel={title}>
			<div role="table" aria-busy="true">
				<TableHeader grouping={grouping} />
				<PlanRowsSkeleton />
			</div>
		</DashboardSection>
	);
}

export interface ActualExpectedTableProps {
	groups: ReadonlyArray<PlanGroup>;
	grouping: PlanGrouping;
	totals: PlanTotals | null;
	hasRows: boolean;
	isLoading: boolean;
	isUpdating: boolean;
	empty: ReactNode;
}

export function ActualExpectedTable({
	groups,
	grouping,
	totals,
	hasRows,
	isLoading,
	isUpdating,
	empty
}: Readonly<ActualExpectedTableProps>) {
	const t = useTranslations();
	const { overrides, toggle, setAll } = useGroupOpenState();
	const openableGroups = openableGroupsOf(groups);
	const canToggleAll = openableGroups.length > 1;
	const areAllOpen = allGroupsOpen(openableGroups, overrides, grouping);
	const showsRows = hasRows && !isLoading;
	const showsEmpty = !hasRows && !isLoading;
	const showsTotals = showsRows && totals !== null;
	const title = t(SECTION_TITLE_KEYS[grouping]);
	const groupCountLabel = t(GROUP_COUNT_KEYS[grouping], { count: groups.length });
	const toggleAllLabel = toggleAllLabelOf(areAllOpen, t);

	if (isLoading) {
		return <ActualExpectedTableSkeleton grouping={grouping} />;
	}

	const toggleAll = () => {
		const keys = openableGroups.map((group) => group.key);
		setAll(keys, !areAllOpen);
	};

	const showsToggleAll = canToggleAll && showsRows;
	const actions = showsToggleAll && (
		<Button type="button" variant="ghost" size="sm" onClick={toggleAll}>
			{toggleAllLabel}
		</Button>
	);

	return (
		<DashboardSection title={title} actions={actions} ariaLabel={title}>
			<div role="table" aria-busy={isUpdating}>
				<TableHeader grouping={grouping} />
				{showsEmpty && empty}
				{showsRows && (
					<div className="hairline-divide-y divide-border">
						{groups.map((group, index) => (
							<PlanGroupBlock
								key={group.key}
								group={group}
								grouping={grouping}
								isOpen={isGroupOpen(overrides, group.key, index, grouping)}
								onToggle={toggle}
							/>
						))}
					</div>
				)}
				{showsTotals && <TotalsRow totals={totals} countLabel={groupCountLabel} />}
			</div>
		</DashboardSection>
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

function emptyTitleOf(period: Period, locale: FormatLocale, t: Translate) {
	const formatter = dateFormatOf(locale, emptyDayFormatOf(period));
	const from = formatter.format(period.from);
	const to = formatter.format(period.to);
	const isOneDay = from === to;
	if (isOneDay) {
		return t('dashboard.actualExpected.EMPTY_DAY', { day: from });
	}
	return t('dashboard.actualExpected.EMPTY_RANGE', { from, to });
}

export function ActualExpectedEmpty({
	period,
	isFiltered,
	hasPlansAhead,
	onClearFilters,
	onPreviousPeriod
}: Readonly<{
	period: Period;
	isFiltered: boolean;
	hasPlansAhead: boolean;
	onClearFilters: () => void;
	onPreviousPeriod: () => void;
}>) {
	const t = useTranslations();
	const locale = useWorkspaceLocale();
	if (hasPlansAhead) {
		return (
			<BlockEmptyMessage
				title={t('dashboard.actualExpected.EMPTY_AHEAD_TITLE')}
				message={t('dashboard.actualExpected.EMPTY_AHEAD_MESSAGE')}
			/>
		);
	}
	const title = emptyTitleOf(period, locale, t);
	if (isFiltered) {
		return (
			<BlockEmptyMessage
				title={title}
				message={t('dashboard.actualExpected.EMPTY_FILTERED_MESSAGE')}
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
			message={t('dashboard.actualExpected.EMPTY_MESSAGE')}
			action={
				<Button type="button" variant="outline" size="default" onClick={onPreviousPeriod}>
					{t('dashboard.period.PREVIOUS')}
				</Button>
			}
		/>
	);
}
