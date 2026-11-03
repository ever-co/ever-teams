'use client';

import { memo, type ReactNode, useCallback, useState } from 'react';
import { isSameYear } from 'date-fns';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
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
import {
	formatOwed,
	type OwedCurrencyTotal,
	type OwedDayGroup,
	type OwedFigures,
	type OwedLine,
	type OwedMemberGroup,
	type PaymentsGrouping
} from '@/core/lib/utils/dashboards/payments-due';
import {
	DayName,
	MISSING_FIGURE,
	NoRateChip,
	OwedFormula,
	OwedValue,
	RateValue,
	TrackedValue
} from './payments-due-cells';
import {
	FORMULA_CELL,
	NESTED_LEAD,
	OPEN_DAY_GROUPS_BY_DEFAULT,
	OWED_CELL,
	PAYMENTS_GRID,
	PAYMENTS_ROW_HEIGHT,
	RATE_CELL,
	ROW_LEAD,
	TRACKED_CELL
} from './payments-due-grid';

type Translate = ReturnType<typeof useTranslations>;

const GROUP_META = 'shrink-0 text-xs font-normal tabular-nums text-muted-foreground max-sm:hidden';

function sectionTitleOf(grouping: PaymentsGrouping, t: Translate) {
	if (grouping === 'day') {
		return t('dashboard.paymentsDue.SECTION_DAYS');
	}
	return t('dashboard.paymentsDue.SECTION_MEMBERS');
}

const MemberDayRow = memo(function MemberDayRow({ line }: Readonly<{ line: OwedLine }>) {
	return (
		<div role="row" className={cn(PAYMENTS_GRID, PAYMENTS_ROW_HEIGHT)}>
			<span role="cell" className={NESTED_LEAD}>
				<DayName day={line.day} />
			</span>
			<span role="cell" className={FORMULA_CELL}>
				<OwedFormula seconds={line.seconds} rate={line.rate} currency={line.currency} />
			</span>
			<span role="cell" className={OWED_CELL}>
				<OwedValue amount={line.amount} currency={line.currency} />
			</span>
		</div>
	);
});

const MemberGroupBlock = memo(function MemberGroupBlock({
	group,
	isOpen,
	onToggle
}: Readonly<{ group: OwedMemberGroup; isOpen: boolean; onToggle: (key: string, wasOpen: boolean) => void }>) {
	const t = useTranslations();
	const handleToggle = useCallback(() => onToggle(group.key, isOpen), [group.key, isOpen, onToggle]);
	const dayCountLabel = t('dashboard.paymentsDue.DAYS_COUNT', { count: group.lines.length });

	const header = (
		<>
			<span role="cell" className={cn(ROW_LEAD, 'flex items-center gap-2')}>
				<GroupToggle isOpen={isOpen} onToggle={handleToggle} className="min-w-0">
					<MemberCell name={group.name} imageUrl={group.imageUrl} />
				</GroupToggle>
				<span className={GROUP_META}>{dayCountLabel}</span>
			</span>
			<span role="cell" className={RATE_CELL}>
				<RateValue rate={group.rate} currency={group.currency} />
			</span>
			<span role="cell" className={TRACKED_CELL}>
				<TrackedValue seconds={group.seconds} />
			</span>
			<span role="cell" className={OWED_CELL}>
				<OwedValue amount={group.amount} currency={group.currency} isStrong />
			</span>
		</>
	);

	return (
		<ReportGroup isOpen={isOpen} header={header} headerClassName={PAYMENTS_GRID}>
			<div className="hairline-divide-y divide-border">
				{group.lines.map((line) => (
					<MemberDayRow key={line.key} line={line} />
				))}
			</div>
		</ReportGroup>
	);
});

const DayMemberRow = memo(function DayMemberRow({ line }: Readonly<{ line: OwedLine }>) {
	return (
		<div role="row" className={cn(PAYMENTS_GRID, PAYMENTS_ROW_HEIGHT)}>
			<span role="cell" className={NESTED_LEAD}>
				<MemberCell name={line.name} imageUrl={line.imageUrl} />
			</span>
			<span role="cell" className={RATE_CELL}>
				<RateValue rate={line.rate} currency={line.currency} />
			</span>
			<span role="cell" className={TRACKED_CELL}>
				<TrackedValue seconds={line.seconds} />
			</span>
			<span role="cell" className={OWED_CELL}>
				<OwedValue amount={line.amount} currency={line.currency} isStrong />
			</span>
		</div>
	);
});

function subtotalsTextOf(subtotals: ReadonlyArray<OwedCurrencyTotal>, locale: string) {
	const parts = subtotals.map((subtotal) => formatOwed(subtotal.amount, subtotal.currency, locale));
	return parts.join(' · ');
}

function DaySubtotals({ subtotals }: Readonly<{ subtotals: ReadonlyArray<OwedCurrencyTotal> }>) {
	const locale = useLocale();
	const hasSubtotals = subtotals.length > 0;
	if (!hasSubtotals) {
		return <span className="truncate text-right text-[13px] text-muted-foreground">{MISSING_FIGURE}</span>;
	}
	const text = subtotalsTextOf(subtotals, locale);
	return (
		<span title={text} className="truncate text-right text-[13px] font-semibold tabular-nums text-foreground">
			{text}
		</span>
	);
}

const DayGroupBlock = memo(function DayGroupBlock({
	group,
	isOpen,
	onToggle
}: Readonly<{ group: OwedDayGroup; isOpen: boolean; onToggle: (key: string, wasOpen: boolean) => void }>) {
	const t = useTranslations();
	const handleToggle = useCallback(() => onToggle(group.key, isOpen), [group.key, isOpen, onToggle]);
	const memberCountLabel = t('dashboard.paymentsDue.MEMBERS_COUNT', { count: group.lines.length });

	const header = (
		<>
			<span role="cell" className={cn(ROW_LEAD, 'flex items-center gap-2')}>
				<GroupToggle isOpen={isOpen} onToggle={handleToggle} className="min-w-0">
					<DayName day={group.day} />
				</GroupToggle>
				<span className={GROUP_META}>{memberCountLabel}</span>
			</span>
			<span role="cell" className={RATE_CELL} />
			<span role="cell" className={TRACKED_CELL}>
				<TrackedValue seconds={group.seconds} />
			</span>
			<span role="cell" className={OWED_CELL}>
				<DaySubtotals subtotals={group.subtotals} />
			</span>
		</>
	);

	return (
		<ReportGroup isOpen={isOpen} header={header} headerClassName={PAYMENTS_GRID}>
			<div className="hairline-divide-y divide-border">
				{group.lines.map((line) => (
					<DayMemberRow key={line.key} line={line} />
				))}
			</div>
		</ReportGroup>
	);
});

function TableHeader() {
	const t = useTranslations();
	return (
		<ReportHeaderRow gridClassName={PAYMENTS_GRID}>
			<span role="columnheader" className={cn(ROW_LEAD, 'pl-6')}>
				{t('common.MEMBER')}
			</span>
			<span role="columnheader" className="text-right max-md:hidden">
				{t('common.RATE')}
			</span>
			<span role="columnheader" className="text-right max-md:hidden">
				{t('dashboard.paymentsDue.COLUMN_TRACKED')}
			</span>
			<span role="columnheader" className="text-right max-md:order-1">
				{t('dashboard.paymentsDue.COLUMN_OWED')}
			</span>
		</ReportHeaderRow>
	);
}

function currencyTotalLabelOf(total: OwedCurrencyTotal, t: Translate) {
	if (total.currency) {
		return t('dashboard.paymentsDue.TOTAL_IN', { currency: total.currency });
	}
	return t('dashboard.paymentsDue.TOTAL_BARE');
}

function TotalLead({ label, memberCount }: Readonly<{ label: string; memberCount: number }>) {
	const t = useTranslations();
	return (
		<span role="cell" className={cn(ROW_LEAD, 'flex items-baseline gap-2 pl-6')}>
			<span className="truncate">{label}</span>
			<span className="truncate text-xs font-normal tabular-nums text-muted-foreground">
				{t('dashboard.paymentsDue.MEMBERS_COUNT', { count: memberCount })}
			</span>
		</span>
	);
}

function CurrencyTotalRow({ total }: Readonly<{ total: OwedCurrencyTotal }>) {
	const t = useTranslations();
	return (
		<ReportTotalsRow gridClassName={PAYMENTS_GRID}>
			<TotalLead label={currencyTotalLabelOf(total, t)} memberCount={total.memberCount} />
			<span role="cell" className={RATE_CELL} />
			<span role="cell" className={TRACKED_CELL}>
				<TrackedValue seconds={total.seconds} />
			</span>
			<span role="cell" className={OWED_CELL}>
				<OwedValue amount={total.amount} currency={total.currency} isStrong />
			</span>
		</ReportTotalsRow>
	);
}

function UnpricedTotalRow({ seconds, memberCount }: Readonly<{ seconds: number; memberCount: number }>) {
	const t = useTranslations();
	return (
		<ReportTotalsRow gridClassName={PAYMENTS_GRID}>
			<TotalLead label={t('dashboard.paymentsDue.TOTAL_UNPRICED')} memberCount={memberCount} />
			<span role="cell" className={RATE_CELL}>
				<NoRateChip />
			</span>
			<span role="cell" className={TRACKED_CELL}>
				<TrackedValue seconds={seconds} />
			</span>
			<span role="cell" className={OWED_CELL}>
				<OwedValue amount={null} currency={null} />
			</span>
		</ReportTotalsRow>
	);
}

/** One closing row per currency, never one sum across currencies, then the time no rate prices. */
function TotalsRows({ figures }: Readonly<{ figures: OwedFigures | null }>) {
	if (!figures) {
		return null;
	}
	const hasUnpriced = figures.unpriced.memberCount > 0;
	return (
		<>
			{figures.currencies.map((total) => (
				<CurrencyTotalRow key={total.key} total={total} />
			))}
			{hasUnpriced && (
				<UnpricedTotalRow seconds={figures.unpriced.seconds} memberCount={figures.unpriced.memberCount} />
			)}
		</>
	);
}

function isGroupOpen(
	overrides: Readonly<Record<string, boolean>>,
	key: string,
	index: number,
	grouping: PaymentsGrouping
) {
	const override = overrides[key];
	if (typeof override === 'boolean') {
		return override;
	}
	if (grouping === 'member') {
		return false;
	}
	return index < OPEN_DAY_GROUPS_BY_DEFAULT;
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

function groupKeysOf(
	grouping: PaymentsGrouping,
	memberGroups: ReadonlyArray<OwedMemberGroup>,
	dayGroups: ReadonlyArray<OwedDayGroup>
) {
	if (grouping === 'day') {
		return dayGroups.map((group) => group.key);
	}
	return memberGroups.map((group) => group.key);
}

function toggleAllLabelOf(areAllOpen: boolean, t: Translate) {
	if (areAllOpen) {
		return t('dashboard.weeklyLimit.COLLAPSE_ALL');
	}
	return t('dashboard.weeklyLimit.EXPAND_ALL');
}

const SKELETON_ROWS = [78, 66, 72, 54, 60, 46];

function PaymentsRowsSkeleton() {
	return (
		<div className="hairline-divide-y divide-border" aria-hidden="true">
			{SKELETON_ROWS.map((nameWidth, index) => (
				<div key={index} className={cn(PAYMENTS_GRID, 'min-h-11')}>
					<span className={cn(ROW_LEAD, 'flex items-center gap-2.5 pl-6')}>
						<span className="size-6 shrink-0 rounded-full bg-foreground/6" />
						<span className={cn('h-2.5', SKELETON_BAR)} style={{ width: `${nameWidth}%` }} />
					</span>
					<span className={cn('h-2.5 w-16 md:ml-auto', SKELETON_BAR, 'max-md:order-2 max-md:ml-8')} />
					<span className={cn('ml-auto h-2.5 w-12', SKELETON_BAR, 'max-md:order-3')} />
					<span className={cn('ml-auto h-2.5 w-16', SKELETON_BAR, 'max-md:order-1')} />
				</div>
			))}
		</div>
	);
}

export function PaymentsDueTableSkeleton({ grouping = 'member' }: Readonly<{ grouping?: PaymentsGrouping }>) {
	const t = useTranslations();
	const title = sectionTitleOf(grouping, t);
	return (
		<DashboardSection title={title} ariaLabel={title}>
			<div role="table" aria-busy="true">
				<TableHeader />
				<PaymentsRowsSkeleton />
			</div>
		</DashboardSection>
	);
}

export interface PaymentsDueTableProps {
	grouping: PaymentsGrouping;
	memberGroups: ReadonlyArray<OwedMemberGroup>;
	dayGroups: ReadonlyArray<OwedDayGroup>;
	figures: OwedFigures | null;
	isLoading: boolean;
	isUpdating: boolean;
	empty: ReactNode;
}

export function PaymentsDueTable({
	grouping,
	memberGroups,
	dayGroups,
	figures,
	isLoading,
	isUpdating,
	empty
}: Readonly<PaymentsDueTableProps>) {
	const t = useTranslations();
	const { overrides, toggle, setAll } = useGroupOpenState();
	const keys = groupKeysOf(grouping, memberGroups, dayGroups);
	const groupCount = keys.length;
	const hasGroups = groupCount > 0;
	const canToggleAll = groupCount > 1;
	const areAllOpen = keys.every((key, index) => isGroupOpen(overrides, key, index, grouping));
	const isByDay = grouping === 'day';
	const showsMembers = hasGroups && !isByDay;
	const showsDays = hasGroups && isByDay;
	const title = sectionTitleOf(grouping, t);

	if (isLoading) {
		return <PaymentsDueTableSkeleton grouping={grouping} />;
	}

	const toggleAll = () => setAll(keys, !areAllOpen);
	const actions = canToggleAll && (
		<Button type="button" variant="ghost" size="sm" onClick={toggleAll}>
			{toggleAllLabelOf(areAllOpen, t)}
		</Button>
	);

	return (
		<DashboardSection title={title} actions={actions} ariaLabel={title}>
			<div role="table" aria-busy={isUpdating}>
				<TableHeader />
				{!hasGroups && empty}
				{showsMembers && (
					<div className="hairline-divide-y divide-border">
						{memberGroups.map((group, index) => (
							<MemberGroupBlock
								key={group.key}
								group={group}
								isOpen={isGroupOpen(overrides, group.key, index, grouping)}
								onToggle={toggle}
							/>
						))}
					</div>
				)}
				{showsDays && (
					<div className="hairline-divide-y divide-border">
						{dayGroups.map((group, index) => (
							<DayGroupBlock
								key={group.key}
								group={group}
								isOpen={isGroupOpen(overrides, group.key, index, grouping)}
								onToggle={toggle}
							/>
						))}
					</div>
				)}
				{hasGroups && <TotalsRows figures={figures} />}
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

function emptyTitleOf(period: Period, locale: string, t: Translate) {
	const formatter = new Intl.DateTimeFormat(locale, emptyDayFormatOf(period));
	const from = formatter.format(period.from);
	const to = formatter.format(period.to);
	const isOneDay = from === to;
	if (isOneDay) {
		return t('dashboard.paymentsDue.EMPTY_DAY', { day: from });
	}
	return t('dashboard.paymentsDue.EMPTY_RANGE', { from, to });
}

export function PaymentsDueEmpty({
	period,
	isFiltered,
	onClearFilters,
	onPreviousPeriod
}: Readonly<{ period: Period; isFiltered: boolean; onClearFilters: () => void; onPreviousPeriod: () => void }>) {
	const t = useTranslations();
	const locale = useLocale();
	if (isFiltered) {
		return (
			<BlockEmptyMessage
				title={t('dashboard.paymentsDue.EMPTY_FILTERED_TITLE')}
				message={t('dashboard.paymentsDue.EMPTY_FILTERED_MESSAGE')}
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
			title={emptyTitleOf(period, locale, t)}
			message={t('dashboard.paymentsDue.EMPTY_MESSAGE')}
			action={
				<Button type="button" variant="outline" size="default" onClick={onPreviousPeriod}>
					{t('dashboard.period.PREVIOUS')}
				</Button>
			}
		/>
	);
}
