'use client';

import { memo, useMemo } from 'react';
import { useLocale, useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { Badge } from '@/core/components/common/badge';
import { EntityTile } from '@/core/components/common/entity-tile';
import { Button } from '@/core/components/duplicated-components/_button';
import { Download, Loader } from '@/core/components/icons';
import type { InvoiceToDownload } from '@/core/hooks/invoices/use-invoice-mutations';
import { cn } from '@/core/lib/helpers';
import { formatOwed } from '@/core/lib/utils/dashboards/payments-due';
import {
	invoiceDayOf,
	invoiceDayTextOf,
	invoiceMonthGroupsOf,
	invoiceMonthTextOf,
	invoicePeriodOfTerms,
	invoicePeriodTextOf,
	invoiceStatusOf,
	invoiceStatusToneOf,
	type InvoiceStatus,
	type InvoiceStatusTone
} from '@/core/lib/utils/invoices';
import type { InvoiceAction } from '@/core/lib/utils/invoice-actions';
import type { TInvoice } from '@/core/types/schemas/organization/invoice.schema';
import type { InvoiceActionTarget } from './invoice-action-dialogs';
import { InvoiceActionsMenu } from './invoice-actions-menu';
import { LEDGER_ROW_GRID, LEDGER_SURFACE } from './invoices-ledger-recipes';

const STATUS_LABEL_KEYS: Record<InvoiceStatus, DottedLanguageObjectStringPaths> = {
	DRAFT: 'invoices.status.DRAFT',
	SENT: 'invoices.status.SENT',
	VIEWED: 'invoices.status.VIEWED',
	FULLY_PAID: 'invoices.status.FULLY_PAID',
	PARTIALLY_PAID: 'invoices.status.PARTIALLY_PAID',
	OVERPAID: 'invoices.status.OVERPAID',
	VOID: 'invoices.status.VOID'
};

const BADGE_VARIANT_BY_TONE: Record<InvoiceStatusTone, 'secondary' | 'info' | 'success' | 'warning'> = {
	neutral: 'secondary',
	info: 'info',
	success: 'success',
	warning: 'warning'
};

const VALUE = 'truncate text-[13px] text-foreground';

const MISSING_VALUE = 'truncate text-[13px] text-muted-foreground';

export function InvoiceStatusBadge({ status }: Readonly<{ status: string | null | undefined }>) {
	const t = useTranslations();
	const rawStatus = status?.trim();
	if (!rawStatus) {
		return null;
	}
	const known = invoiceStatusOf(rawStatus);
	const variant = BADGE_VARIANT_BY_TONE[invoiceStatusToneOf(known)];
	let label = rawStatus;
	if (known) {
		label = t(STATUS_LABEL_KEYS[known]);
	}
	return <Badge variant={variant}>{label}</Badge>;
}

function numberTextOf(invoice: TInvoice) {
	const number = invoice.invoiceNumber;
	if (typeof number !== 'number') {
		return null;
	}
	return String(number);
}

function pdfFileNameOf(numberText: string | null) {
	if (!numberText) {
		return 'invoice.pdf';
	}
	return `invoice-${numberText}.pdf`;
}

function InvoiceTotal({ invoice }: Readonly<{ invoice: TInvoice }>) {
	const t = useTranslations();
	const locale = useLocale();
	const total = invoice.totalValue;
	if (typeof total !== 'number') {
		return <span className={cn(MISSING_VALUE, 'lg:text-right')}>{t('invoices.NO_TOTAL')}</span>;
	}
	const currency = invoice.currency ?? null;
	return (
		<span className="truncate text-[13px] font-medium tabular-nums text-foreground lg:text-right">
			{formatOwed(total, currency, locale)}
		</span>
	);
}

/** The API drops an archived client from the invoice's relation while the invoice keeps the client's id. */
function clientNameOf(invoice: TInvoice, clientNames: ReadonlyMap<string, string>) {
	const relatedName = invoice.toContact?.name?.trim();
	if (relatedName) {
		return relatedName;
	}
	const clientId = invoice.toContactId;
	if (!clientId) {
		return null;
	}
	return clientNames.get(clientId) ?? null;
}

export type InvoiceActionHandler = (target: InvoiceActionTarget, action: InvoiceAction) => void;

interface InvoiceRowProps {
	invoice: TInvoice;
	clientNames: ReadonlyMap<string, string>;
	timeZone: string | null | undefined;
	isDownloading: boolean;
	onDownload: (invoice: InvoiceToDownload) => void;
	canEdit: boolean;
	isChanging: boolean;
	onAction: InvoiceActionHandler;
}

const InvoiceRow = memo(function InvoiceRow({
	invoice,
	clientNames,
	timeZone,
	isDownloading,
	onDownload,
	canEdit,
	isChanging,
	onAction
}: InvoiceRowProps) {
	const t = useTranslations();
	const locale = useLocale();
	const clientName = clientNameOf(invoice, clientNames) ?? t('invoices.NO_CLIENT');
	const numberText = numberTextOf(invoice);
	const pickAction = (picked: TInvoice, action: InvoiceAction) => {
		onAction({ invoice: picked, numberText: numberText ?? '', clientName }, action);
	};
	const issuedText = invoiceDayTextOf(invoiceDayOf(invoice.invoiceDate, timeZone), locale);
	const dueText = invoiceDayTextOf(invoiceDayOf(invoice.dueDate, timeZone), locale);
	const statedPeriod = invoicePeriodOfTerms(invoice.terms);
	let periodText: string | null = null;
	if (statedPeriod) {
		periodText = invoicePeriodTextOf(statedPeriod, locale);
	}
	const numberLabel = t('invoices.NUMBER', { number: numberText ?? '' });
	const downloadLabel = t('invoices.DOWNLOAD_PDF_OF', { number: numberText ?? '' });

	return (
		<li className={cn(LEDGER_ROW_GRID, 'min-h-14 px-3 py-2')}>
			<span className="flex min-w-0 items-center gap-2.5">
				<EntityTile name={clientName} imageUrl={invoice.toContact?.imageUrl} className="size-8 text-[11px]" />
				<span className="flex min-w-0 flex-col">
					<span className="truncate text-[13px] font-medium text-foreground">{clientName}</span>
					<span className="truncate text-xs tabular-nums text-muted-foreground">
						{numberText && numberLabel}
						{!numberText && t('invoices.NO_NUMBER')}
						{issuedText && ` · ${t('invoices.ISSUED_ON', { date: issuedText })}`}
					</span>
				</span>
			</span>
			<span className="flex min-w-0 max-lg:hidden">
				{periodText && <span className={cn(VALUE, 'tabular-nums')}>{periodText}</span>}
				{!periodText && <span className={MISSING_VALUE}>{t('invoices.NO_PERIOD')}</span>}
			</span>
			<span className="flex min-w-0 max-lg:hidden">
				{dueText && (
					<span className={cn(VALUE, 'tabular-nums')}>{t('invoices.DUE_ON', { date: dueText })}</span>
				)}
				{!dueText && <span className={MISSING_VALUE}>{t('invoices.NO_DUE_DATE')}</span>}
			</span>
			<span className="flex min-w-0 flex-col-reverse items-end gap-1 lg:contents">
				<span className="flex min-w-0">
					<InvoiceStatusBadge status={invoice.status} />
				</span>
				<InvoiceTotal invoice={invoice} />
			</span>
			<span className="flex items-center justify-end gap-0.5">
				<Button
					type="button"
					variant="ghost"
					size="icon"
					aria-label={downloadLabel}
					title={downloadLabel}
					disabled={isDownloading}
					onClick={() => onDownload({ id: invoice.id, fileName: pdfFileNameOf(numberText) })}
					className="text-muted-foreground"
				>
					{isDownloading && <Loader className="animate-spin" />}
					{!isDownloading && <Download />}
				</Button>
				{canEdit && (
					<span className="flex size-8 items-center justify-center">
						<InvoiceActionsMenu
							invoice={invoice}
							numberText={numberText ?? ''}
							isChanging={isChanging}
							onAction={pickAction}
						/>
					</span>
				)}
			</span>
		</li>
	);
});

export function InvoicesLedger({
	invoices,
	clientNames,
	timeZone,
	pendingPdfId,
	onDownload,
	canEdit,
	changingId,
	onAction
}: Readonly<{
	invoices: ReadonlyArray<TInvoice>;
	/** Every client's name by id, archived ones included. */
	clientNames: ReadonlyMap<string, string>;
	timeZone: string | null | undefined;
	pendingPdfId: string | null;
	onDownload: (invoice: InvoiceToDownload) => void;
	canEdit: boolean;
	changingId: string | null;
	onAction: InvoiceActionHandler;
}>) {
	const t = useTranslations();
	const locale = useLocale();
	const groups = useMemo(() => invoiceMonthGroupsOf(invoices, timeZone), [invoices, timeZone]);

	return (
		<div className="flex flex-col gap-5">
			{groups.map((group) => {
				const monthText = invoiceMonthTextOf(group.key, locale) ?? t('invoices.UNDATED');
				return (
					<section key={group.key} aria-label={monthText} className="flex flex-col gap-2">
						<h2 className="px-1 text-[13px] font-medium text-foreground first-letter:uppercase">
							{monthText}
						</h2>
						<ul className={cn(LEDGER_SURFACE, 'py-1')}>
							{group.invoices.map((invoice) => (
								<InvoiceRow
									key={invoice.id}
									invoice={invoice}
									clientNames={clientNames}
									timeZone={timeZone}
									isDownloading={pendingPdfId === invoice.id}
									onDownload={onDownload}
									canEdit={canEdit}
									isChanging={changingId === invoice.id}
									onAction={onAction}
								/>
							))}
						</ul>
					</section>
				);
			})}
		</div>
	);
}
