'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AnimatedHeight } from '@/core/components/common/animated-height';
import { Badge } from '@/core/components/common/badge';
import { DashboardSection } from '@/core/components/dashboards/kit/dashboard-layout';
import { FoldToggle } from '@/core/components/dashboards/kit/fold-toggle';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { Button } from '@/core/components/duplicated-components/_button';
import type { InvoiceDraftState } from '@/core/hooks/invoices/use-new-invoice';
import { cn } from '@/core/lib/helpers';
import { formatOwed } from '@/core/lib/utils/dashboards/payments-due';
import { invoicePeriodOfTerms, invoicePeriodTextOf } from '@/core/lib/utils/invoices';
import type { TInvoice } from '@/core/types/schemas/organization/invoice.schema';

const VISIBLE_INVOICES = 4;

function EarlierInvoiceRow({ invoice, overlaps }: Readonly<{ invoice: TInvoice; overlaps: boolean }>) {
	const t = useTranslations();
	const locale = useLocale();
	const statedPeriod = invoicePeriodOfTerms(invoice.terms);
	let periodText: string = t('invoices.NO_PERIOD');
	if (statedPeriod) {
		periodText = invoicePeriodTextOf(statedPeriod, locale) ?? periodText;
	}
	const number = invoice.invoiceNumber;
	const hasNumber = typeof number === 'number';
	const total = invoice.totalValue;
	const hasTotal = typeof total === 'number';
	return (
		<li className="flex items-start justify-between gap-3 py-1.5">
			<span className="flex min-w-0 flex-col gap-0.5">
				<span className="truncate text-[13px] font-medium tabular-nums text-foreground">
					{hasNumber && t('invoices.NUMBER', { number: String(number) })}
					{!hasNumber && t('invoices.NO_NUMBER')}
				</span>
				<span className="truncate text-xs tabular-nums text-muted-foreground">{periodText}</span>
				{overlaps && <Badge variant="warning">{t('invoices.new.earlier.OVERLAPS')}</Badge>}
			</span>
			{hasTotal && (
				<span className="shrink-0 text-[13px] tabular-nums text-foreground">
					{formatOwed(total, invoice.currency ?? null, locale)}
				</span>
			)}
		</li>
	);
}

function EarlierSkeleton() {
	return (
		<div aria-hidden="true" className="flex flex-col gap-3 py-1">
			<span className={cn('h-2.5 w-40', SKELETON_BAR)} />
			<span className={cn('h-2.5 w-28', SKELETON_BAR)} />
		</div>
	);
}

/**
 * What was already invoiced to the client, beside the invoice being prepared. The API records neither the period of
 * an invoice nor the time it covers, so nothing is taken off the lines: the list says so and marks the saved
 * invoices whose stated period shares a day with this one.
 */
export function EarlierInvoices({ invoice }: Readonly<{ invoice: InvoiceDraftState }>) {
	const t = useTranslations();
	const [isExpanded, setIsExpanded] = useState(false);
	const clientName = invoice.client?.name ?? '';
	const overlappingIds = useMemo(
		() => new Set(invoice.overlappingInvoices.map((saved) => saved.id)),
		[invoice.overlappingInvoices]
	);
	const orderedInvoices = useMemo(() => {
		const others = invoice.earlierInvoices.filter((saved) => !overlappingIds.has(saved.id));
		return [...invoice.overlappingInvoices, ...others];
	}, [invoice.earlierInvoices, invoice.overlappingInvoices, overlappingIds]);

	const visibleInvoices = orderedInvoices.slice(0, VISIBLE_INVOICES);
	const foldedInvoices = orderedInvoices.slice(VISIBLE_INVOICES);
	const canFold = foldedInvoices.length > 0;
	const hasInvoices = orderedInvoices.length > 0;
	const isSettled = !invoice.areEarlierLoading && !invoice.haveEarlierFailed;
	const showsNone = isSettled && !hasInvoices;
	let toggleLabel = t('invoices.new.earlier.SHOW_MORE', { count: foldedInvoices.length });
	if (isExpanded) {
		toggleLabel = t('invoices.new.earlier.SHOW_FEWER');
	}

	return (
		<DashboardSection
			title={t('invoices.new.earlier.TITLE', { client: clientName })}
			bodyClassName="flex flex-col gap-2 px-4 pb-4"
		>
			<p className="text-xs text-muted-foreground text-pretty">{t('invoices.new.earlier.NOTE')}</p>
			{invoice.areEarlierLoading && <EarlierSkeleton />}
			{invoice.haveEarlierFailed && (
				<div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
					<p role="alert" className="text-xs text-destructive-ink">
						{t('invoices.new.earlier.ERROR')}
					</p>
					<Button type="button" variant="outline" size="sm" onClick={() => void invoice.refetchEarlier()}>
						{t('pages.unauthorized.TRY_AGAIN')}
					</Button>
				</div>
			)}
			{showsNone && <p className="text-[13px] text-foreground">{t('invoices.new.earlier.NONE')}</p>}
			{hasInvoices && (
				<ul className="flex flex-col">
					{visibleInvoices.map((saved) => (
						<EarlierInvoiceRow key={saved.id} invoice={saved} overlaps={overlappingIds.has(saved.id)} />
					))}
				</ul>
			)}
			{canFold && (
				<>
					<AnimatedHeight>
						{isExpanded && (
							<ul className="flex flex-col">
								{foldedInvoices.map((saved) => (
									<EarlierInvoiceRow
										key={saved.id}
										invoice={saved}
										overlaps={overlappingIds.has(saved.id)}
									/>
								))}
							</ul>
						)}
					</AnimatedHeight>
					<FoldToggle
						label={toggleLabel}
						isExpanded={isExpanded}
						onToggle={() => setIsExpanded((expanded) => !expanded)}
					/>
				</>
			)}
		</DashboardSection>
	);
}
