'use client';

import { memo, type ReactNode, useCallback, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AnimatedHeight } from '@/core/components/common/animated-height';
import { FoldToggle } from '@/core/components/dashboards/kit/fold-toggle';
import { MemberCell } from '@/core/components/dashboards/kit/member-cell';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import type {
	OwedCurrencyTotal,
	OwedDayGroup,
	OwedLine,
	OwedMemberGroup
} from '@/core/lib/utils/dashboards/payments-due';
import { OwedAmount, RateChip } from './payments-due-amount';
import {
	DayName,
	metaWithNote,
	NoRateChip,
	OwedFormula,
	OwedValue,
	TrackedValue,
	useBillingRateNote
} from './payments-due-cells';
import {
	FOOTER_AMOUNT,
	LINE_FIGURE,
	LINE_FORMULA,
	LINE_LEADER,
	STATEMENT_BODY,
	STATEMENT_CARD,
	STATEMENT_FOOTER,
	STATEMENT_HEADER,
	STATEMENT_LINE,
	STATEMENT_PLAIN_LINE,
	VISIBLE_STATEMENT_LINES
} from './payments-due-statement-recipes';

export type StatementToggle = (key: string, wasExpanded: boolean) => void;

/** The member's lines carry an avatar: centred rows read better than a baseline the avatar has no part in. */
const MEMBER_LINE = 'min-h-9 items-center';

const MEMBER_LEADER = 'translate-y-0';

/** On a phone the formula sits under the member's name, past the 24px avatar and its gap. */
const MEMBER_FORMULA = 'max-sm:pl-8.5';

const DAY_FORMULA = "sm:before:mr-2 sm:before:content-['·']";

function Leader({ className }: Readonly<{ className?: string }>) {
	return <span aria-hidden="true" className={cn(LINE_LEADER, className)} />;
}

const MemberDayLine = memo(function MemberDayLine({ line }: Readonly<{ line: OwedLine }>) {
	const isPriced = line.amount !== null;
	if (!isPriced) {
		return (
			<li className={STATEMENT_PLAIN_LINE}>
				<DayName day={line.day} />
				<Leader />
				<TrackedValue seconds={line.seconds} className={LINE_FIGURE} />
			</li>
		);
	}
	return (
		<li className={STATEMENT_LINE}>
			<DayName day={line.day} />
			<OwedFormula
				seconds={line.seconds}
				rate={line.rate}
				currency={line.currency}
				className={cn(LINE_FORMULA, DAY_FORMULA)}
			/>
			<Leader />
			<OwedValue amount={line.amount} currency={line.currency} className={LINE_FIGURE} />
		</li>
	);
});

const DayMemberLine = memo(function DayMemberLine({ line }: Readonly<{ line: OwedLine }>) {
	const billingRateNote = useBillingRateNote(line.rateSource);
	const isPriced = line.amount !== null;
	if (!isPriced) {
		return (
			<li className={cn(STATEMENT_LINE, MEMBER_LINE)}>
				<MemberCell name={line.name} imageUrl={line.imageUrl} meta={billingRateNote} />
				<span className={cn(LINE_FORMULA, MEMBER_FORMULA, 'flex')}>
					<NoRateChip />
				</span>
				<Leader className={MEMBER_LEADER} />
				<TrackedValue seconds={line.seconds} className={LINE_FIGURE} />
			</li>
		);
	}
	return (
		<li className={cn(STATEMENT_LINE, MEMBER_LINE)}>
			<MemberCell name={line.name} imageUrl={line.imageUrl} meta={billingRateNote} />
			<OwedFormula
				seconds={line.seconds}
				rate={line.rate}
				currency={line.currency}
				className={cn(LINE_FORMULA, MEMBER_FORMULA)}
			/>
			<Leader className={MEMBER_LEADER} />
			<OwedValue amount={line.amount} currency={line.currency} className={LINE_FIGURE} />
		</li>
	);
});

function renderMemberDayLine(line: OwedLine) {
	return <MemberDayLine key={line.key} line={line} />;
}

function renderDayMemberLine(line: OwedLine) {
	return <DayMemberLine key={line.key} line={line} />;
}

function FoldedLines({
	lines,
	renderLine,
	isExpanded,
	onToggle,
	moreLabel
}: Readonly<{
	lines: ReadonlyArray<OwedLine>;
	renderLine: (line: OwedLine) => ReactNode;
	isExpanded: boolean;
	onToggle: () => void;
	moreLabel: (count: number) => string;
}>) {
	const t = useTranslations();
	const visibleLines = lines.slice(0, VISIBLE_STATEMENT_LINES);
	const foldedLines = lines.slice(VISIBLE_STATEMENT_LINES);
	const foldedCount = foldedLines.length;
	const canFold = foldedCount > 0;
	let toggleLabel = moreLabel(foldedCount);
	if (isExpanded) {
		toggleLabel = t('dashboard.paymentsDue.statements.SHOW_FEWER');
	}
	return (
		<div className={STATEMENT_BODY}>
			<ul>{visibleLines.map(renderLine)}</ul>
			{canFold && (
				<>
					<AnimatedHeight>{isExpanded && <ul>{foldedLines.map(renderLine)}</ul>}</AnimatedHeight>
					<FoldToggle label={toggleLabel} isExpanded={isExpanded} onToggle={onToggle} />
				</>
			)}
		</div>
	);
}

function trackedFigureInk(chunks: ReactNode) {
	return <span className="text-[13px] font-medium tabular-nums text-foreground">{chunks}</span>;
}

function TrackedFigure({ seconds }: Readonly<{ seconds: number }>) {
	const t = useTranslations();
	const duration = formatDurationShort(seconds);
	return (
		<p className="text-xs text-muted-foreground">
			{t.rich('dashboard.paymentsDue.statements.TRACKED_FIGURE', {
				duration,
				figure: trackedFigureInk
			})}
		</p>
	);
}

function FooterFigure({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
	return (
		<div className="ml-auto flex min-w-0 flex-col items-end gap-0.5">
			<span className="text-xs text-muted-foreground">{label}</span>
			{children}
		</div>
	);
}

function TrackedFooterFigure({ seconds }: Readonly<{ seconds: number }>) {
	const t = useTranslations();
	return (
		<FooterFigure label={t('dashboard.paymentsDue.COLUMN_TRACKED')}>
			<span className={cn(FOOTER_AMOUNT, 'tabular-nums')}>{formatDurationShort(seconds)}</span>
		</FooterFigure>
	);
}

/** Owed is the largest figure of a statement; a member without a rate shows their hours in its place. */
function MemberStatementFooter({ group }: Readonly<{ group: OwedMemberGroup }>) {
	const t = useTranslations();
	if (group.amount === null) {
		return (
			<footer className={STATEMENT_FOOTER}>
				<TrackedFooterFigure seconds={group.seconds} />
			</footer>
		);
	}
	return (
		<footer className={STATEMENT_FOOTER}>
			<TrackedFigure seconds={group.seconds} />
			<FooterFigure label={t('dashboard.paymentsDue.COLUMN_OWED')}>
				<OwedAmount amount={group.amount} currency={group.currency} className={FOOTER_AMOUNT} />
			</FooterFigure>
		</footer>
	);
}

export const MemberStatementCard = memo(function MemberStatementCard({
	group,
	isExpanded,
	onToggle
}: Readonly<{ group: OwedMemberGroup; isExpanded: boolean; onToggle: StatementToggle }>) {
	const t = useTranslations();
	const handleToggle = useCallback(() => onToggle(group.key, isExpanded), [group.key, isExpanded, onToggle]);
	const moreLabel = useCallback(
		(count: number) => t('dashboard.paymentsDue.statements.SHOW_MORE_DAYS', { count }),
		[t]
	);
	const daysLabel = t('dashboard.paymentsDue.DAYS_COUNT', { count: group.lines.length });
	const billingRateNote = useBillingRateNote(group.rateSource);
	const headerMeta = metaWithNote(daysLabel, billingRateNote);
	return (
		<article
			aria-label={t('dashboard.paymentsDue.statements.MEMBER_LABEL', { name: group.name })}
			className={STATEMENT_CARD}
		>
			<header className={STATEMENT_HEADER}>
				<MemberCell name={group.name} imageUrl={group.imageUrl} meta={headerMeta} />
				<RateChip rate={group.rate} currency={group.currency} />
			</header>
			<FoldedLines
				lines={group.lines}
				renderLine={renderMemberDayLine}
				isExpanded={isExpanded}
				onToggle={handleToggle}
				moreLabel={moreLabel}
			/>
			<MemberStatementFooter group={group} />
		</article>
	);
});

function DayTrackedFigure({ group }: Readonly<{ group: OwedDayGroup }>) {
	const t = useTranslations();
	const hasUnpricedTime = group.unpricedSeconds > 0;
	return (
		<div className="flex min-w-0 flex-col gap-0.5">
			<TrackedFigure seconds={group.seconds} />
			{hasUnpricedTime && (
				<span className="text-xs tabular-nums text-muted-foreground">
					{t('dashboard.paymentsDue.statements.UNPRICED_PART', {
						duration: formatDurationShort(group.unpricedSeconds)
					})}
				</span>
			)}
		</div>
	);
}

/** A day can owe in several currencies: one amount per currency, each with its code, never one sum. */
function DaySubtotalAmounts({ subtotals }: Readonly<{ subtotals: ReadonlyArray<OwedCurrencyTotal> }>) {
	const showsCodes = subtotals.length > 1;
	return (
		<>
			{subtotals.map((subtotal) => (
				<OwedAmount
					key={subtotal.key}
					amount={subtotal.amount}
					currency={subtotal.currency}
					showsCode={showsCodes}
					className={FOOTER_AMOUNT}
				/>
			))}
		</>
	);
}

function DayStatementFooter({ group }: Readonly<{ group: OwedDayGroup }>) {
	const t = useTranslations();
	const hasSubtotals = group.subtotals.length > 0;
	if (!hasSubtotals) {
		return (
			<footer className={STATEMENT_FOOTER}>
				<TrackedFooterFigure seconds={group.seconds} />
			</footer>
		);
	}
	return (
		<footer className={STATEMENT_FOOTER}>
			<DayTrackedFigure group={group} />
			<FooterFigure label={t('dashboard.paymentsDue.COLUMN_OWED')}>
				<DaySubtotalAmounts subtotals={group.subtotals} />
			</FooterFigure>
		</footer>
	);
}

export const DayStatementCard = memo(function DayStatementCard({
	group,
	isExpanded,
	onToggle
}: Readonly<{ group: OwedDayGroup; isExpanded: boolean; onToggle: StatementToggle }>) {
	const t = useTranslations();
	const locale = useLocale();
	const handleToggle = useCallback(() => onToggle(group.key, isExpanded), [group.key, isExpanded, onToggle]);
	const moreLabel = useCallback(
		(count: number) => t('dashboard.paymentsDue.statements.SHOW_MORE_MEMBERS', { count }),
		[t]
	);
	const dayFormat = useMemo(
		() => new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric' }),
		[locale]
	);
	const dayText = dayFormat.format(group.day);
	const membersLabel = t('dashboard.paymentsDue.MEMBERS_COUNT', { count: group.lines.length });
	return (
		<article
			aria-label={t('dashboard.paymentsDue.statements.DAY_LABEL', { day: dayText })}
			className={STATEMENT_CARD}
		>
			<header className={STATEMENT_HEADER}>
				<span className="flex min-w-0 flex-col">
					<DayName day={group.day} />
					<span className="truncate text-xs text-muted-foreground">{membersLabel}</span>
				</span>
			</header>
			<FoldedLines
				lines={group.lines}
				renderLine={renderDayMemberLine}
				isExpanded={isExpanded}
				onToggle={handleToggle}
				moreLabel={moreLabel}
			/>
			<DayStatementFooter group={group} />
		</article>
	);
});
