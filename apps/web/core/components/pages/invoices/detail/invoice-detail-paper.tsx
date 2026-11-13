'use client';

import { useLocale, useTranslations } from 'next-intl';
import {
	InvoicePaper,
	PaperHead,
	PaperLine,
	PaperLines,
	PaperNote,
	PaperParties,
	PaperTotals,
	type PaperTotalRow
} from '@/core/components/invoices/invoice-paper';
import { formatOwed } from '@/core/lib/utils/dashboards/payments-due';
import { invoiceNoteOfTerms } from '@/core/lib/utils/invoice-edit';
import { invoicePaperFiguresOf, type InvoicePaperFigures, type PaperAdjustment } from '@/core/lib/utils/invoice-paper';
import { formatPercent } from '@/core/lib/utils/invoice-totals';
import {
	formatInvoiceHours,
	invoiceDayOf,
	invoiceDayTextOf,
	invoicePeriodOfTerms,
	invoicePeriodTextOf
} from '@/core/lib/utils/invoices';
import type { TSavedInvoice } from '@/core/types/schemas/organization/invoice.schema';

type Translate = ReturnType<typeof useTranslations>;

interface InvoiceDetailPaperProps {
	invoice: TSavedInvoice;
	senderName: string | null;
	clientName: string;
	numberText: string | null;
	timeZone: string | null | undefined;
}

function moneyOf(amount: number | null, currency: string | null, locale: string) {
	if (amount === null) {
		return null;
	}
	return formatOwed(amount, currency, locale);
}

function adjustmentLabelOf(adjustment: PaperAdjustment, baseText: string | null, locale: string, t: Translate) {
	if (adjustment.percent === null) {
		if (adjustment.kind === 'discount') {
			return t('invoices.detail.DISCOUNT');
		}
		if (adjustment.kind === 'tax') {
			return t('invoices.detail.TAX');
		}
		return t('invoices.detail.TAX2');
	}
	const percent = formatPercent(adjustment.percent, locale);
	if (adjustment.kind === 'discount') {
		return t('invoices.new.adjustments.DISCOUNT_ROW', { percent });
	}
	if (adjustment.kind === 'tax2') {
		return t('invoices.detail.TAX2_PERCENT', { percent });
	}
	if (baseText) {
		return t('invoices.new.adjustments.TAX_ROW', { percent, base: baseText });
	}
	return t('invoices.detail.TAX_PERCENT', { percent });
}

function adjustmentValueOf(adjustment: PaperAdjustment, currency: string | null, locale: string) {
	if (adjustment.amount === null) {
		return formatPercent(adjustment.percent ?? 0, locale);
	}
	const amountText = formatOwed(adjustment.amount, currency, locale);
	if (adjustment.kind === 'discount') {
		return `−${amountText}`;
	}
	return amountText;
}

function paymentRowsOf(invoice: TSavedInvoice, currency: string | null, locale: string, t: Translate) {
	const paid = invoice.alreadyPaid;
	const left = invoice.amountDue;
	const hasPaidPart = typeof paid === 'number' && paid > 0;
	if (!hasPaidPart || typeof left !== 'number') {
		return [];
	}
	return [
		{ key: 'paid', label: t('invoices.detail.PAID'), value: `−${formatOwed(paid, currency, locale)}` },
		{
			key: 'left',
			label: t('invoices.detail.LEFT_TO_PAY'),
			value: formatOwed(left, currency, locale),
			isTotal: true
		}
	];
}

function totalRowsOf(
	figures: InvoicePaperFigures,
	invoice: TSavedInvoice,
	currency: string | null,
	locale: string,
	t: Translate
): PaperTotalRow[] {
	const rows: PaperTotalRow[] = [];
	const subtotalText = moneyOf(figures.subtotal, currency, locale);
	const hasAdjustments = figures.adjustments.length > 0;
	if (subtotalText && hasAdjustments) {
		rows.push({ key: 'subtotal', label: t('invoices.new.adjustments.SUBTOTAL'), value: subtotalText });
	}
	const baseText = moneyOf(figures.taxBase, currency, locale);
	for (const adjustment of figures.adjustments) {
		rows.push({
			key: adjustment.kind,
			label: adjustmentLabelOf(adjustment, baseText, locale, t),
			value: adjustmentValueOf(adjustment, currency, locale)
		});
	}
	const totalText = moneyOf(figures.total, currency, locale) ?? t('invoices.NO_TOTAL');
	rows.push(
		{ key: 'total', label: t('invoices.new.TOTAL'), value: totalText, isTotal: true },
		...paymentRowsOf(invoice, currency, locale, t)
	);
	return rows;
}

export function InvoiceDetailPaper({
	invoice,
	senderName,
	clientName,
	numberText,
	timeZone
}: Readonly<InvoiceDetailPaperProps>) {
	const t = useTranslations();
	const locale = useLocale();
	const figures = invoicePaperFiguresOf(invoice);
	const currency = invoice.currency ?? null;
	const issuedText = invoiceDayTextOf(invoiceDayOf(invoice.invoiceDate, timeZone), locale);
	const dueText = invoiceDayTextOf(invoiceDayOf(invoice.dueDate, timeZone), locale);
	const period = invoicePeriodOfTerms(invoice.terms);
	let periodText: string | null = null;
	if (period) {
		periodText = invoicePeriodTextOf(period, locale);
	}
	// Only an invoice made from billable time opens its terms with the period line, which the head already states
	let note = invoice.terms?.trim() ?? '';
	if (period) {
		note = invoiceNoteOfTerms(invoice.terms);
	}
	const clientEmail = invoice.toContact?.primaryEmail?.trim();

	const facts = [];
	if (issuedText) {
		facts.push({ key: 'issued', label: t('invoices.new.details.ISSUE_DATE'), value: issuedText });
	}
	if (dueText) {
		facts.push({ key: 'due', label: t('invoices.new.details.DUE_DATE'), value: dueText });
	}
	if (periodText) {
		facts.push({ key: 'period', label: t('invoices.new.PERIOD'), value: periodText });
	}
	const clientLines = [];
	if (clientEmail) {
		clientLines.push(clientEmail);
	}
	const hasLines = figures.lines.length > 0;

	return (
		<InvoicePaper className="mx-auto w-full max-w-3xl">
			<PaperHead sender={senderName} title={t('invoices.detail.PAPER_TITLE')} number={numberText} facts={facts} />
			<PaperParties
				parties={[
					{ key: 'from', label: t('invoices.new.FROM'), name: senderName ?? '' },
					{ key: 'to', label: t('invoices.new.BILL_TO'), name: clientName, lines: clientLines }
				]}
			/>
			{hasLines && (
				<PaperLines
					labels={{
						description: t('invoices.detail.COLUMN_DESCRIPTION'),
						hours: t('invoices.detail.COLUMN_HOURS'),
						rate: t('invoices.detail.COLUMN_RATE'),
						amount: t('invoices.detail.COLUMN_AMOUNT')
					}}
				>
					{figures.lines.map((line) => {
						let hoursText = '';
						if (line.hours !== null) {
							hoursText = t('invoices.new.HOURS', { hours: formatInvoiceHours(line.hours, locale) });
						}
						return (
							<PaperLine
								key={line.id}
								description={line.description ?? t('invoices.detail.NO_DESCRIPTION')}
								hours={hoursText}
								rate={moneyOf(line.rate, currency, locale) ?? ''}
								amount={moneyOf(line.amount, currency, locale) ?? ''}
							/>
						);
					})}
				</PaperLines>
			)}
			{!hasLines && <p className="text-[13px] text-muted-foreground">{t('invoices.detail.NO_LINES')}</p>}
			<PaperTotals rows={totalRowsOf(figures, invoice, currency, locale, t)} />
			{note && <PaperNote label={t('invoices.new.terms.NOTE')}>{note}</PaperNote>}
		</InvoicePaper>
	);
}
