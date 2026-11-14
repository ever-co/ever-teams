'use client';

import { memo, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { LedgerFilter } from '@/core/hooks/invoices/use-invoices-overview';
import { cn } from '@/core/lib/helpers';
import { formatOwed } from '@/core/lib/utils/dashboards/payments-due';
import type { CurrencyAmount, InvoiceStandingSummary } from '@/core/lib/utils/invoice-standing';
import { MoneyFigure } from './money-figure';

const BAND_SURFACE = 'rounded-xl bg-card px-4 py-3.5 hairline-ring ring-border shadow-sm shadow-black/6.5';

/** Overdue money is hatched, so the split reads without its colour too. */
const OVERDUE_FILL =
	'bg-[repeating-linear-gradient(135deg,hsl(var(--destructive)/0.75)_0_3px,hsl(var(--destructive)/0.35)_3px_6px)]';

const NOT_YET_DUE_FILL = 'bg-primary';

const FIGURE_BUTTON =
	'group/figure flex min-w-0 flex-col items-start gap-0.5 rounded-lg px-2 py-1.5 -mx-2 text-left outline-none transition-colors hover:bg-foreground/[0.03] focus-visible:ring-[3px] focus-visible:ring-ring/25 aria-pressed:bg-foreground/[0.05]';

const LEGEND_LABEL = 'inline-flex items-center gap-1.5 text-xs text-muted-foreground';

const LEGEND_SQUARE = 'size-2 shrink-0 rounded-[3px]';

function amountIn(sums: ReadonlyArray<CurrencyAmount>, currency: string | null): CurrencyAmount | null {
	return sums.find((sum) => sum.currency === currency) ?? null;
}

function shareOf(part: number, whole: number) {
	if (whole <= 0) {
		return 0;
	}
	const share = (part / whole) * 100;
	return Math.min(Math.max(share, 0), 100);
}

type BandPick = Extract<LedgerFilter, 'open' | 'overdue' | 'draft'>;

interface FigureProps {
	filter: BandPick;
	picked: LedgerFilter;
	onPick: (filter: LedgerFilter) => void;
	children: ReactNode;
}

function BandFigure({ filter, picked, onPick, children }: Readonly<FigureProps>) {
	const isPicked = picked === filter;
	const handleClick = () => {
		if (isPicked) {
			onPick('all');
			return;
		}
		onPick(filter);
	};
	return (
		<button type="button" aria-pressed={isPicked} onClick={handleClick} className={FIGURE_BUTTON}>
			{children}
		</button>
	);
}

function OtherCurrencies({
	owed,
	mainCurrency
}: Readonly<{ owed: ReadonlyArray<CurrencyAmount>; mainCurrency: string | null }>) {
	const t = useTranslations();
	const locale = useLocale();
	const others = owed.filter((sum) => sum.currency !== mainCurrency);
	if (others.length === 0) {
		return null;
	}
	const amounts = others.map((sum) => formatOwed(sum.amount, sum.currency, locale)).join(' · ');
	return <p className="text-xs text-muted-foreground">{t('invoices.money.ALSO_OWED', { amounts })}</p>;
}

export function InvoiceMoneyBandSkeleton() {
	return (
		<div aria-hidden="true" className={cn(BAND_SURFACE, 'flex flex-col gap-3')}>
			<div className="flex flex-col gap-2">
				<span className="h-3 w-12 animate-pulse rounded-full bg-foreground/[0.06]" />
				<span className="h-6 w-36 animate-pulse rounded-full bg-foreground/[0.07]" />
			</div>
			<span className="h-2 w-full animate-pulse rounded-full bg-foreground/[0.06]" />
			<div className="flex gap-8">
				<span className="h-8 w-24 animate-pulse rounded-md bg-foreground/[0.05]" />
				<span className="h-8 w-24 animate-pulse rounded-md bg-foreground/[0.05]" />
				<span className="h-8 w-20 animate-pulse rounded-md bg-foreground/[0.05]" />
			</div>
		</div>
	);
}

interface InvoiceMoneyBandProps {
	summary: InvoiceStandingSummary;
	picked: LedgerFilter;
	onPick: (filter: LedgerFilter) => void;
}

/**
 * What the workspace is owed, as one bar split between money not yet due (brand) and money past its due day (hatched
 * destructive), with the figures under it; each figure filters the ledger. Only invoices still owed count, read whole,
 * and one currency per bar: the others are listed under it, never added.
 */
export const InvoiceMoneyBand = memo(function InvoiceMoneyBand({ summary, picked, onPick }: InvoiceMoneyBandProps) {
	const t = useTranslations();
	const main = summary.owed[0] ?? null;
	const currency = main?.currency ?? null;
	const owedAmount = main?.amount ?? 0;
	const overdue = amountIn(summary.overdue, currency);
	const overdueAmount = overdue?.amount ?? 0;
	const notYetDueAmount = owedAmount - overdueAmount;
	const overdueShare = shareOf(overdueAmount, owedAmount);
	const notYetDueShare = shareOf(notYetDueAmount, owedAmount);
	const owedCount = summary.counts.open + summary.counts.overdue;
	const isNothingOwed = owedCount === 0;
	// Owed invoices whose balances the API never stated leave no amount to show: their count stands alone
	const isOwedAmountKnown = main !== null;
	const showsSplit = !isNothingOwed && isOwedAmountKnown;
	const showsFigureAmounts = isNothingOwed || isOwedAmountKnown;
	const draftCount = summary.counts.draft;

	return (
		<section aria-label={t('invoices.money.LABEL')} className={cn(BAND_SURFACE, 'flex flex-col gap-3')}>
			<div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
				<div className="flex min-w-0 flex-col gap-0.5">
					<span className="text-xs text-muted-foreground">{t('invoices.money.OWED')}</span>
					{isNothingOwed && (
						<span className="text-sm text-muted-foreground">{t('invoices.money.NOTHING_OWED')}</span>
					)}
					{!isNothingOwed && (
						<span className="flex items-baseline gap-2">
							{isOwedAmountKnown && (
								<MoneyFigure
									amount={owedAmount}
									currency={currency}
									quietCents
									className="text-2xl font-semibold text-foreground"
								/>
							)}
							<span className="text-xs tabular-nums text-muted-foreground">
								{t('invoices.money.INVOICE_COUNT', { count: owedCount })}
							</span>
						</span>
					)}
				</div>
				<OtherCurrencies owed={summary.owed} mainCurrency={currency} />
			</div>

			{showsSplit && (
				<div
					role="img"
					aria-label={t('invoices.money.SPLIT_LABEL')}
					className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-foreground/[0.06]"
				>
					{notYetDueShare > 0 && (
						<span className={NOT_YET_DUE_FILL} style={{ width: `${notYetDueShare}%` }} />
					)}
					{overdueShare > 0 && <span className={OVERDUE_FILL} style={{ width: `${overdueShare}%` }} />}
				</div>
			)}

			<div className="flex flex-wrap gap-x-8 gap-y-2">
				<BandFigure filter="open" picked={picked} onPick={onPick}>
					<span className={LEGEND_LABEL}>
						<span className={cn(LEGEND_SQUARE, NOT_YET_DUE_FILL)} />
						{t('invoices.money.NOT_YET_DUE')}
					</span>
					<span className="flex items-baseline gap-1.5 text-sm font-medium text-foreground">
						{showsFigureAmounts && <MoneyFigure amount={notYetDueAmount} currency={currency} />}
						<span className="text-xs font-normal text-muted-foreground">{summary.counts.open}</span>
					</span>
				</BandFigure>
				<BandFigure filter="overdue" picked={picked} onPick={onPick}>
					<span className={LEGEND_LABEL}>
						<span className={cn(LEGEND_SQUARE, OVERDUE_FILL)} />
						{t('invoices.money.OVERDUE')}
					</span>
					<span className="flex items-baseline gap-1.5 text-sm font-medium text-foreground">
						{showsFigureAmounts && <MoneyFigure amount={overdueAmount} currency={currency} />}
						<span className="text-xs font-normal text-muted-foreground">{summary.counts.overdue}</span>
					</span>
				</BandFigure>
				<BandFigure filter="draft" picked={picked} onPick={onPick}>
					<span className={LEGEND_LABEL}>
						<span className={cn(LEGEND_SQUARE, 'hairline-border border-dashed border-foreground/40')} />
						{t('invoices.money.DRAFTS')}
					</span>
					<span className="text-sm font-medium tabular-nums text-foreground">
						{t('invoices.money.DRAFT_COUNT', { count: draftCount })}
					</span>
				</BandFigure>
			</div>

			{summary.owedWithoutAmount > 0 && (
				<p className="text-xs text-muted-foreground">
					{t('invoices.money.WITHOUT_BALANCE', { count: summary.owedWithoutAmount })}
				</p>
			)}
		</section>
	);
});
