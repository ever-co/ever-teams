'use client';

import { memo, type ReactNode } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { BlockEmptyMessage, DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { MetricStrip, type MetricItem } from '@/core/components/dashboards/kit/metric-strip';
import { DASHBOARD_SURFACE } from '@/core/components/dashboards/kit/recipes';
import { Invoice } from '@/core/components/icons';
import { MoneyFigure } from '@/core/components/invoices/money-figure';
import { cn } from '@/core/lib/helpers';
import { formatOwed } from '@/core/lib/utils/dashboards/payments-due';
import { daysUntilDue, type CurrencyAmount, type InvoiceStandingSummary } from '@/core/lib/utils/invoice-standing';
import { invoiceDayTextOf } from '@/core/lib/utils/invoices';
import { daysAgoTextOf } from './client-format';

type StandingFigure = 'owed' | 'overdue' | 'billed' | 'last';

type Translate = ReturnType<typeof useTranslations>;

const STRIP_SPLIT = 'hairline-divide-x divide-border';

function countOf(sums: ReadonlyArray<CurrencyAmount>) {
	let count = 0;
	for (const sum of sums) {
		count += sum.count;
	}
	return count;
}

/** The other currencies of a figure, never added to its main one: "Also €1,200.00 · £300.00". */
function otherCurrenciesText(sums: ReadonlyArray<CurrencyAmount>, locale: string, t: Translate) {
	const others = sums.slice(1);
	if (others.length === 0) {
		return null;
	}
	const amountTexts = others.map((sum) => formatOwed(sum.amount, sum.currency, locale));
	const amounts = amountTexts.join(' · ');
	return t('clients.standing.ALSO', { amounts });
}

function moneyHintOf(sums: ReadonlyArray<CurrencyAmount>, locale: string, t: Translate): ReactNode {
	const others = otherCurrenciesText(sums, locale, t);
	if (others) {
		return others;
	}
	const count = countOf(sums);
	return t('invoices.COUNT', { count });
}

function MoneyValue({ sums }: Readonly<{ sums: ReadonlyArray<CurrencyAmount> }>) {
	const t = useTranslations();
	const main = sums[0];
	if (!main) {
		return <span className="font-normal text-muted-foreground">{t('clients.standing.NOTHING')}</span>;
	}
	return <MoneyFigure amount={main.amount} currency={main.currency} quietCents />;
}

function moneyItemOf(
	key: StandingFigure,
	label: string,
	sums: ReadonlyArray<CurrencyAmount>,
	locale: string,
	t: Translate
): MetricItem<StandingFigure> {
	const hasAmount = sums.length > 0;
	let hint: ReactNode;
	if (hasAmount) {
		hint = moneyHintOf(sums, locale, t);
	}
	return { key, label, value: <MoneyValue sums={sums} />, hint };
}

function lastInvoiceItemOf(
	lastIssuedDay: string | null,
	todayKey: string,
	locale: string,
	t: Translate
): MetricItem<StandingFigure> {
	const label = t('clients.standing.LAST_INVOICE');
	const dayText = invoiceDayTextOf(lastIssuedDay, locale);
	if (!lastIssuedDay || !dayText) {
		return { key: 'last', label, value: t('invoices.UNDATED') };
	}
	const daysAhead = daysUntilDue(lastIssuedDay, todayKey);
	if (daysAhead === null) {
		return { key: 'last', label, value: dayText };
	}
	const daysAgo = Math.max(-daysAhead, 0);
	const agoText = daysAgoTextOf(daysAgo, locale);
	return { key: 'last', label, value: dayText, hint: agoText };
}

function standingItemsOf(
	summary: InvoiceStandingSummary,
	todayKey: string,
	locale: string,
	t: Translate
): MetricItem<StandingFigure>[] {
	const owed = moneyItemOf('owed', t('invoices.money.OWED'), summary.owed, locale, t);
	const overdue = moneyItemOf('overdue', t('invoices.money.OVERDUE'), summary.overdue, locale, t);
	const hasOverdue = summary.overdue.length > 0;
	if (hasOverdue) {
		overdue.tone = 'destructive';
	}
	const billed = moneyItemOf('billed', t('clients.standing.BILLED'), summary.billed, locale, t);
	const last = lastInvoiceItemOf(summary.lastIssuedDay, todayKey, locale, t);
	return [owed, overdue, billed, last];
}

function loadingItemsOf(t: Translate): MetricItem<StandingFigure>[] {
	return [
		{ key: 'owed', label: t('invoices.money.OWED'), value: null },
		{ key: 'overdue', label: t('invoices.money.OVERDUE'), value: null },
		{ key: 'billed', label: t('clients.standing.BILLED'), value: null },
		{ key: 'last', label: t('clients.standing.LAST_INVOICE'), value: null }
	];
}

function hasAnyInvoice(summary: InvoiceStandingSummary) {
	const counts = Object.values(summary.counts);
	return counts.some((count) => count > 0);
}

interface ClientStandingBandProps {
	clientName: string;
	summary: InvoiceStandingSummary;
	todayKey: string;
	isLoading: boolean;
	hasFailed: boolean;
	onRetry: () => void;
	newInvoiceHref: string | null;
	className?: string;
}

/**
 * What the client owes and has been billed, from its invoices and nothing else: owed (open and overdue), overdue,
 * billed over its lifetime, and its latest invoice, in one band split by hairlines. One currency per figure; the
 * others are listed under it, never added.
 */
export const ClientStandingBand = memo(function ClientStandingBand({
	clientName,
	summary,
	todayKey,
	isLoading,
	hasFailed,
	onRetry,
	newInvoiceHref,
	className
}: ClientStandingBandProps) {
	const t = useTranslations();
	const locale = useLocale();
	const label = t('clients.standing.LABEL', { name: clientName });

	if (hasFailed) {
		return <DashboardErrorNotice title={t('invoices.new.earlier.ERROR')} onRetry={onRetry} className={className} />;
	}
	if (isLoading) {
		return (
			<div className={cn(DASHBOARD_SURFACE, className)}>
				<MetricStrip items={loadingItemsOf(t)} ariaLabel={label} isLoading className={STRIP_SPLIT} />
			</div>
		);
	}
	if (!hasAnyInvoice(summary)) {
		let action: ReactNode;
		if (newInvoiceHref) {
			action = (
				<Button asChild variant="outline" size="default">
					<Link href={newInvoiceHref}>
						<Invoice />
						<span>{t('invoices.NEW_INVOICE')}</span>
					</Link>
				</Button>
			);
		}
		return (
			<div className={cn(DASHBOARD_SURFACE, className)}>
				<BlockEmptyMessage
					title={t('clients.standing.NO_INVOICE_TITLE', { name: clientName })}
					message={t('clients.standing.NO_INVOICE_MESSAGE')}
					action={action}
					className="py-6"
				/>
			</div>
		);
	}

	const items = standingItemsOf(summary, todayKey, locale, t);
	const hasUnstatedBalance = summary.owedWithoutAmount > 0;
	return (
		<div className={cn(DASHBOARD_SURFACE, className)}>
			<MetricStrip items={items} ariaLabel={label} className={STRIP_SPLIT} />
			{hasUnstatedBalance && (
				<p className="px-4 pb-3 text-xs text-muted-foreground">
					{t('invoices.money.WITHOUT_BALANCE', { count: summary.owedWithoutAmount })}
				</p>
			)}
		</div>
	);
});
