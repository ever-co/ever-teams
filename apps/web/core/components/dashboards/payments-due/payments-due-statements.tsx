'use client';

import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { DASHBOARD_SURFACE, SECTION_META, SECTION_TITLE, SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import {
	type OwedDayGroup,
	type OwedFigures,
	type OwedMemberGroup,
	type PaymentsGrouping,
	type StatementSection,
	statementSectionsOf
} from '@/core/lib/utils/dashboards/payments-due';
import { DayStatementCard, MemberStatementCard, type StatementToggle } from './payments-due-statement-card';
import {
	STATEMENT_BODY,
	STATEMENT_FOOTER,
	STATEMENT_GRID,
	STATEMENT_HEADER,
	VISIBLE_STATEMENT_LINES
} from './payments-due-statement-recipes';

type Translate = ReturnType<typeof useTranslations>;

type ExpandedKeys = Readonly<Record<string, boolean>>;

function titleOf(grouping: PaymentsGrouping, t: Translate) {
	if (grouping === 'day') {
		return t('dashboard.paymentsDue.statements.TITLE_DAYS');
	}
	return t('dashboard.paymentsDue.statements.TITLE_MEMBERS');
}

function isExpandedIn(expandedKeys: ExpandedKeys, key: string) {
	return expandedKeys[key] === true;
}

function hasFoldedLines(group: { lines: ReadonlyArray<unknown> }) {
	return group.lines.length > VISIBLE_STATEMENT_LINES;
}

function foldableKeysOf(
	grouping: PaymentsGrouping,
	memberGroups: ReadonlyArray<OwedMemberGroup>,
	dayGroups: ReadonlyArray<OwedDayGroup>
) {
	if (grouping === 'day') {
		const foldableDays = dayGroups.filter(hasFoldedLines);
		return foldableDays.map((group) => group.key);
	}
	const foldableMembers = memberGroups.filter(hasFoldedLines);
	return foldableMembers.map((group) => group.key);
}

function useExpandedStatements() {
	const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

	const toggle = useCallback<StatementToggle>((key, wasExpanded) => {
		setExpandedKeys((current) => ({ ...current, [key]: !wasExpanded }));
	}, []);

	const setAll = useCallback((keys: ReadonlyArray<string>, isExpanded: boolean) => {
		const next: Record<string, boolean> = {};
		for (const key of keys) {
			next[key] = isExpanded;
		}
		setExpandedKeys(next);
	}, []);

	return { expandedKeys, toggle, setAll };
}

function toggleAllLabelOf(areAllExpanded: boolean, t: Translate) {
	if (areAllExpanded) {
		return t('dashboard.weeklyLimit.COLLAPSE_ALL');
	}
	return t('dashboard.weeklyLimit.EXPAND_ALL');
}

function trackedMetaOf(figures: OwedFigures | null, countText: string, t: Translate) {
	if (!figures) {
		return null;
	}
	const hasTime = figures.trackedSeconds > 0;
	if (!hasTime) {
		return null;
	}
	const duration = formatDurationShort(figures.trackedSeconds);
	const trackedText = t('dashboard.paymentsDue.statements.TRACKED_TOTAL', { duration });
	return `${countText} · ${trackedText}`;
}

function countTextOf(
	grouping: PaymentsGrouping,
	figures: OwedFigures | null,
	dayGroups: ReadonlyArray<OwedDayGroup>,
	t: Translate
) {
	if (grouping === 'day') {
		return t('dashboard.paymentsDue.DAYS_COUNT', { count: dayGroups.length });
	}
	const memberCount = figures?.trackedMemberCount ?? 0;
	return t('dashboard.paymentsDue.MEMBERS_COUNT', { count: memberCount });
}

function StatementsHeader({
	title,
	meta,
	actions
}: Readonly<{ title: string; meta?: ReactNode; actions?: ReactNode }>) {
	return (
		<header className="flex min-h-8 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1">
			<div className="flex min-w-0 items-baseline gap-2">
				<h2 className={SECTION_TITLE}>{title}</h2>
				{meta && <span className={SECTION_META}>{meta}</span>}
			</div>
			{actions}
		</header>
	);
}

function sectionTitleOf(section: StatementSection, t: Translate) {
	if (!section.isPriced) {
		return t('dashboard.paymentsDue.TOTAL_UNPRICED');
	}
	if (section.currency) {
		return t('dashboard.paymentsDue.figures.OWED_IN', { currency: section.currency });
	}
	return t('dashboard.paymentsDue.statements.NO_CURRENCY');
}

function SectionHeading({ section }: Readonly<{ section: StatementSection }>) {
	const t = useTranslations();
	const duration = formatDurationShort(section.seconds);
	const hint = t('dashboard.paymentsDue.figures.CURRENCY_HINT', { count: section.memberCount, duration });
	return (
		<div className="flex flex-wrap items-baseline gap-x-2 px-1 pt-1">
			<h3 className="text-xs font-medium text-foreground">{sectionTitleOf(section, t)}</h3>
			<span className="text-xs tabular-nums text-muted-foreground">{hint}</span>
		</div>
	);
}

function isPricedSection(section: StatementSection) {
	return section.isPriced;
}

/**
 * Members by amount owed. With several currencies each gets a heading, and members without a rate get theirs, so
 * no unpriced card reads as part of the last currency.
 */
function MemberStatements({
	memberGroups,
	expandedKeys,
	onToggle
}: Readonly<{
	memberGroups: ReadonlyArray<OwedMemberGroup>;
	expandedKeys: ExpandedKeys;
	onToggle: StatementToggle;
}>) {
	const sections = useMemo(() => statementSectionsOf(memberGroups), [memberGroups]);
	const pricedSections = sections.filter(isPricedSection);
	const showsHeadings = pricedSections.length > 1;
	return (
		<div className="flex flex-col gap-4">
			{sections.map((section) => (
				<div key={section.key} className="flex flex-col gap-2">
					{showsHeadings && <SectionHeading section={section} />}
					<div className={STATEMENT_GRID}>
						{section.groups.map((group) => (
							<MemberStatementCard
								key={group.key}
								group={group}
								isExpanded={isExpandedIn(expandedKeys, group.key)}
								onToggle={onToggle}
							/>
						))}
					</div>
				</div>
			))}
		</div>
	);
}

function DayStatements({
	dayGroups,
	expandedKeys,
	onToggle
}: Readonly<{ dayGroups: ReadonlyArray<OwedDayGroup>; expandedKeys: ExpandedKeys; onToggle: StatementToggle }>) {
	return (
		<div className={STATEMENT_GRID}>
			{dayGroups.map((group) => (
				<DayStatementCard
					key={group.key}
					group={group}
					isExpanded={isExpandedIn(expandedKeys, group.key)}
					onToggle={onToggle}
				/>
			))}
		</div>
	);
}

const SKELETON_CARDS = [
	{ key: 'first', nameWidth: 'w-32', lineCount: 5 },
	{ key: 'second', nameWidth: 'w-24', lineCount: 5 },
	{ key: 'third', nameWidth: 'w-28', lineCount: 3 },
	{ key: 'fourth', nameWidth: 'w-20', lineCount: 4 }
];

const SKELETON_LINE_WIDTHS = ['w-24', 'w-20', 'w-28', 'w-16', 'w-24'];

function StatementCardSkeleton({ nameWidth, lineCount }: Readonly<{ nameWidth: string; lineCount: number }>) {
	const lineWidths = SKELETON_LINE_WIDTHS.slice(0, lineCount);
	return (
		<div className={cn(DASHBOARD_SURFACE, 'flex flex-col')}>
			<div className={STATEMENT_HEADER}>
				<span className="flex min-w-0 items-center gap-2.5">
					<span className="size-6 shrink-0 animate-pulse rounded-full bg-foreground/[0.06]" />
					<span className={cn('h-2.5', nameWidth, SKELETON_BAR)} />
				</span>
				<span className={cn('h-3.5 w-16', SKELETON_BAR)} />
			</div>
			<div className={cn(STATEMENT_BODY, 'flex flex-col')}>
				{lineWidths.map((width, index) => (
					<span key={index} className="flex min-h-8 items-center gap-3">
						<span className={cn('h-2.5', width, SKELETON_BAR)} />
						<span className="flex-1" />
						<span className={cn('h-2.5 w-14', SKELETON_BAR)} />
					</span>
				))}
			</div>
			<div className={STATEMENT_FOOTER}>
				<span className={cn('h-2.5 w-24', SKELETON_BAR)} />
				<span className={cn('ml-auto h-5 w-24', SKELETON_BAR)} />
			</div>
		</div>
	);
}

export function PaymentsDueStatementsSkeleton({ grouping = 'member' }: Readonly<{ grouping?: PaymentsGrouping }>) {
	const t = useTranslations();
	const title = titleOf(grouping, t);
	return (
		<section aria-label={title} aria-busy="true" className="flex flex-col gap-3">
			<StatementsHeader title={title} meta={<span className={cn('inline-block h-2 w-28', SKELETON_BAR)} />} />
			<div inert className={STATEMENT_GRID}>
				{SKELETON_CARDS.map((card) => (
					<StatementCardSkeleton key={card.key} nameWidth={card.nameWidth} lineCount={card.lineCount} />
				))}
			</div>
		</section>
	);
}

export interface PaymentsDueStatementsProps {
	grouping: PaymentsGrouping;
	memberGroups: ReadonlyArray<OwedMemberGroup>;
	dayGroups: ReadonlyArray<OwedDayGroup>;
	figures: OwedFigures | null;
	isLoading: boolean;
	isUpdating: boolean;
	empty: ReactNode;
}

export function PaymentsDueStatements({
	grouping,
	memberGroups,
	dayGroups,
	figures,
	isLoading,
	isUpdating,
	empty
}: Readonly<PaymentsDueStatementsProps>) {
	const t = useTranslations();
	const { expandedKeys, toggle, setAll } = useExpandedStatements();
	const foldableKeys = useMemo(
		() => foldableKeysOf(grouping, memberGroups, dayGroups),
		[dayGroups, grouping, memberGroups]
	);

	if (isLoading) {
		return <PaymentsDueStatementsSkeleton grouping={grouping} />;
	}

	const title = titleOf(grouping, t);
	const isByDay = grouping === 'day';
	const hasMembers = memberGroups.length > 0;
	const hasDays = dayGroups.length > 0;
	const showsMembers = hasMembers && !isByDay;
	const showsDays = hasDays && isByDay;
	const showsEmpty = !showsMembers && !showsDays;
	const canToggleAll = foldableKeys.length > 0;
	const areAllExpanded = foldableKeys.every((key) => isExpandedIn(expandedKeys, key));
	const countText = countTextOf(grouping, figures, dayGroups, t);
	const meta = trackedMetaOf(figures, countText, t);

	const toggleAll = () => setAll(foldableKeys, !areAllExpanded);
	const actions = canToggleAll && (
		<Button type="button" variant="ghost" size="sm" onClick={toggleAll}>
			{toggleAllLabelOf(areAllExpanded, t)}
		</Button>
	);

	return (
		<section aria-label={title} aria-busy={isUpdating} className="flex flex-col gap-3">
			<StatementsHeader title={title} meta={meta} actions={actions} />
			{showsEmpty && <div className={DASHBOARD_SURFACE}>{empty}</div>}
			{showsMembers && (
				<MemberStatements memberGroups={memberGroups} expandedKeys={expandedKeys} onToggle={toggle} />
			)}
			{showsDays && <DayStatements dayGroups={dayGroups} expandedKeys={expandedKeys} onToggle={toggle} />}
		</section>
	);
}
