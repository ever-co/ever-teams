'use client';

import { memo, useMemo } from 'react';
import { useLocale, useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { Badge } from '@/core/components/common/badge';
import { EntityTile } from '@/core/components/common/entity-tile';
import { Button } from '@/core/components/duplicated-components/_button';
import { Download, Loader } from '@/core/components/icons';
import { InvoiceDueText } from '@/core/components/invoices/invoice-due-text';
import { InvoiceStandingLabel } from '@/core/components/invoices/invoice-standing';
import { useMediaQuery } from '@/core/hooks/common/use-media-query';
import type { InvoiceToDownload } from '@/core/hooks/invoices/use-invoice-mutations';
import { cn } from '@/core/lib/helpers';
import { formatOwed } from '@/core/lib/utils/dashboards/payments-due';
import { invoiceClientNameOf, invoiceNumberTextOf, invoicePdfFileNameOf } from '@/core/lib/utils/invoice-labels';
import { invoiceStandingOf } from '@/core/lib/utils/invoice-standing';
import {
	invoiceDayOf,
	invoiceDayTextOf,
	invoiceMonthGroupsOf,
	invoiceMonthTextOf,
	invoicePeriodOfTerms,
	invoicePeriodTextOf,
	invoiceStatusOf,
	invoiceStatusToneOf,
	todayDayKey,
	type InvoiceStatus,
	type InvoiceStatusTone
} from '@/core/lib/utils/invoices';
import { invoiceActionsOf, type InvoiceMenuAction } from '@/core/lib/utils/invoice-actions';
import type { TInvoice } from '@/core/types/schemas/organization/invoice.schema';
import type { InvoiceActionTarget } from './invoice-action-dialogs';
import { InvoiceActionsMenu, type InvoiceMenuDownload } from './invoice-actions-menu';
import { COMPACT_LEDGER_QUERY, LEDGER_ROW_DETAILS, LEDGER_ROW_GRID, LEDGER_SURFACE } from './invoices-ledger-recipes';

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

interface CurrencyTotal {
	currency: string;
	amount: number;
}

function compareLargestFirst(first: CurrencyTotal, second: CurrencyTotal) {
	return second.amount - first.amount;
}

/** What a month's invoices add up to, one total per currency, largest first; a void invoice bills nothing. */
function billedTotalsOf(invoices: ReadonlyArray<TInvoice>) {
	const amountByCurrency = new Map<string, number>();
	for (const invoice of invoices) {
		const isVoid = invoiceStatusOf(invoice.status) === 'VOID';
		const total = invoice.totalValue;
		if (isVoid || typeof total !== 'number') {
			continue;
		}
		const currency = invoice.currency ?? '';
		const sum = amountByCurrency.get(currency) ?? 0;
		amountByCurrency.set(currency, sum + total);
	}
	const totals: CurrencyTotal[] = [];
	for (const [currency, amount] of amountByCurrency) {
		totals.push({ currency, amount });
	}
	totals.sort(compareLargestFirst);
	return totals;
}

function totalsTextOf(totals: ReadonlyArray<CurrencyTotal>, locale: string) {
	const texts = totals.map((total) => formatOwed(total.amount, total.currency || null, locale));
	return texts.join(' · ');
}

export type InvoiceActionHandler = (target: InvoiceActionTarget, action: InvoiceMenuAction) => void;

interface InvoiceRowProps {
	invoice: TInvoice;
	clientNames: ReadonlyMap<string, string>;
	timeZone: string | null | undefined;
	todayKey: string;
	isDownloading: boolean;
	onDownload: (invoice: InvoiceToDownload) => void;
	canEdit: boolean;
	isChanging: boolean;
	onAction: InvoiceActionHandler;
	/** The row has room for one button only: its menu then holds the PDF too. */
	isCompact: boolean;
	canRevise: boolean;
}

function hasActionsMenu(invoice: TInvoice, canEdit: boolean) {
	if (!canEdit) {
		return false;
	}
	const status = invoiceStatusOf(invoice.status);
	const actions = invoiceActionsOf(status);
	return actions.length > 0;
}

const InvoiceRow = memo(function InvoiceRow({
	invoice,
	clientNames,
	timeZone,
	todayKey,
	isDownloading,
	onDownload,
	canEdit,
	isChanging,
	onAction,
	isCompact,
	canRevise
}: InvoiceRowProps) {
	const t = useTranslations();
	const locale = useLocale();
	const clientName = invoiceClientNameOf(invoice, clientNames) ?? t('invoices.NO_CLIENT');
	const numberText = invoiceNumberTextOf(invoice);
	const fileName = invoicePdfFileNameOf(numberText);
	const toDownload: InvoiceToDownload = { id: invoice.id, fileName };
	const hasMenu = hasActionsMenu(invoice, canEdit);
	const downloadsFromMenu = isCompact && hasMenu;
	const showsDownloadButton = !downloadsFromMenu;
	// Wide, an invoice without actions keeps its empty slot so the download buttons stay in one column.
	const keepsMenuSlot = canEdit && !isCompact;
	const showsMenu = keepsMenuSlot || downloadsFromMenu;
	let menuDownload: InvoiceMenuDownload | undefined;
	if (downloadsFromMenu) {
		menuDownload = { isPending: isDownloading, onSelect: () => onDownload(toDownload) };
	}
	const pickAction = (picked: TInvoice, action: InvoiceMenuAction) => {
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
	const periodLabel = periodText ?? t('invoices.NO_PERIOD');
	let dueLabel = t('invoices.NO_DUE_DATE');
	if (dueText) {
		dueLabel = t('invoices.DUE_ON', { date: dueText });
	}
	const standing = invoiceStandingOf(invoice, todayKey, timeZone);
	// While money is owed, the due day reads as what it means today ("Due in 5 days", "12 days late")
	const isOwed = standing === 'open' || standing === 'overdue';
	const dueToday = <InvoiceDueText invoice={invoice} todayKey={todayKey} timeZone={timeZone} />;

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
				{isOwed && dueToday}
				{!isOwed && <span className={cn(MISSING_VALUE, 'tabular-nums')}>{dueLabel}</span>}
			</span>
			<span className="flex min-w-0 flex-col-reverse items-end gap-1 lg:contents">
				<span className="flex min-w-0">
					<InvoiceStandingLabel invoice={invoice} todayKey={todayKey} timeZone={timeZone} />
				</span>
				<InvoiceTotal invoice={invoice} />
			</span>
			<span className="flex items-center justify-end gap-0.5">
				{showsDownloadButton && (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						aria-label={downloadLabel}
						title={downloadLabel}
						disabled={isDownloading}
						onClick={() => onDownload(toDownload)}
						className="text-muted-foreground"
					>
						{isDownloading && <Loader className="animate-spin" />}
						{!isDownloading && <Download />}
					</Button>
				)}
				{showsMenu && (
					<span className="flex size-8 items-center justify-center">
						<InvoiceActionsMenu
							invoice={invoice}
							numberText={numberText ?? ''}
							isChanging={isChanging}
							onAction={pickAction}
							download={menuDownload}
							canRevise={canRevise}
						/>
					</span>
				)}
			</span>
			<span className={cn(LEDGER_ROW_DETAILS, 'text-xs tabular-nums text-muted-foreground')}>
				{periodLabel} · {isOwed && dueToday}
				{!isOwed && dueLabel}
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
	changingIds,
	onAction,
	canRevise = false,
	todayKey
}: Readonly<{
	invoices: ReadonlyArray<TInvoice>;
	/** Every client's name by id, archived ones included. */
	clientNames: ReadonlyMap<string, string>;
	timeZone: string | null | undefined;
	/** Today in the organization's zone, where invoices are dated; read here when not given. */
	todayKey?: string;
	pendingPdfId: string | null;
	onDownload: (invoice: InvoiceToDownload) => void;
	canEdit: boolean;
	changingIds: ReadonlySet<string>;
	onAction: InvoiceActionHandler;
	/** The role may edit an invoice, or void and replace it: it may create invoices. */
	canRevise?: boolean;
}>) {
	const t = useTranslations();
	const locale = useLocale();
	const isCompact = useMediaQuery(COMPACT_LEDGER_QUERY);
	const groups = useMemo(() => invoiceMonthGroupsOf(invoices, timeZone), [invoices, timeZone]);
	const today = todayKey ?? todayDayKey(timeZone);

	return (
		<div className="flex flex-col gap-5">
			{groups.map((group) => {
				const monthText = invoiceMonthTextOf(group.key, locale) ?? t('invoices.UNDATED');
				const totalsText = totalsTextOf(billedTotalsOf(group.invoices), locale);
				return (
					<section key={group.key} aria-label={monthText} className="flex flex-col gap-2">
						<div className="flex min-h-6 items-baseline justify-between gap-3 px-1">
							<h2 className="flex min-w-0 items-baseline gap-2 text-[13px] font-medium text-foreground">
								<span className="truncate first-letter:uppercase">{monthText}</span>
								<span className="shrink-0 text-xs font-normal tabular-nums text-muted-foreground">
									{t('invoices.COUNT', { count: group.invoices.length })}
								</span>
							</h2>
							{totalsText && (
								<span className="truncate text-xs tabular-nums text-muted-foreground">
									{totalsText}
								</span>
							)}
						</div>
						<ul className={cn(LEDGER_SURFACE, 'py-1')}>
							{group.invoices.map((invoice) => (
								<InvoiceRow
									key={invoice.id}
									invoice={invoice}
									clientNames={clientNames}
									timeZone={timeZone}
									todayKey={today}
									isDownloading={pendingPdfId === invoice.id}
									onDownload={onDownload}
									canEdit={canEdit}
									isChanging={changingIds.has(invoice.id)}
									onAction={onAction}
									isCompact={isCompact}
									canRevise={canRevise}
								/>
							))}
						</ul>
					</section>
				);
			})}
		</div>
	);
}
