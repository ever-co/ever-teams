'use client';

import { memo, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { AnimatedHeight } from '@/core/components/common/animated-height';
import { SegmentedControl, type SegmentedControlItem } from '@/core/components/common/segmented-control';
import { Button } from '@/core/components/duplicated-components/_button';
import { BlockEmptyMessage, DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { FoldToggle } from '@/core/components/dashboards/kit/fold-toggle';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { FileText, Invoice } from '@/core/components/icons';
import { InvoiceDueText } from '@/core/components/invoices/invoice-due-text';
import { InvoiceStandingLabel } from '@/core/components/invoices/invoice-standing';
import { MoneyFigure } from '@/core/components/invoices/money-figure';
import { cn } from '@/core/lib/helpers';
import {
	invoiceStandingOf,
	type InvoiceStanding,
	type InvoiceStandingSummary
} from '@/core/lib/utils/invoice-standing';
import { invoicePagePathOf } from '@/core/lib/utils/invoice-paths';
import { invoiceDayOf, invoiceDayTextOf } from '@/core/lib/utils/invoices';
import type { TInvoice } from '@/core/types/schemas/organization/invoice.schema';
import { ClientSection } from './client-section';

type InvoiceFilter = 'all' | 'open' | 'overdue' | 'paid' | 'draft';

const FILTERS: ReadonlyArray<InvoiceFilter> = ['all', 'open', 'overdue', 'paid', 'draft'];

const FILTER_LABEL_KEYS: Record<InvoiceFilter, DottedLanguageObjectStringPaths> = {
	all: 'clients.invoices.ALL',
	open: 'clients.invoices.OPEN',
	overdue: 'invoices.standing.OVERDUE',
	paid: 'invoices.status.FULLY_PAID',
	draft: 'invoices.money.DRAFTS'
};

const SUMMARY_KEYS: ReadonlyArray<readonly [InvoiceStanding, DottedLanguageObjectStringPaths]> = [
	['open', 'clients.invoices.SUMMARY_OPEN'],
	['overdue', 'clients.invoices.SUMMARY_OVERDUE'],
	['paid', 'clients.invoices.SUMMARY_PAID'],
	['draft', 'clients.invoices.SUMMARY_DRAFTS'],
	['void', 'clients.invoices.SUMMARY_VOID']
];

/** A client with more invoices than this gets the standing filter, and its list folds after them. */
const SHOWN_INVOICES = 5;

const SKELETON_ROWS = ['first', 'second', 'third'];

/** One grid for the labels and the rows; under 36rem of room a row reads on two lines instead. */
const ROW_GRID =
	'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 @xl:grid-cols-[6rem_7.5rem_minmax(0,1fr)_8.5rem_7.5rem]';

const WIDE_ONLY = 'hidden @xl:flex';

const NARROW_ONLY = '@xl:hidden';

function numberTextOf(invoice: TInvoice) {
	const number = invoice.invoiceNumber;
	if (typeof number !== 'number') {
		return null;
	}
	return String(number);
}

function rowsOfFilter(
	invoices: ReadonlyArray<TInvoice>,
	filter: InvoiceFilter,
	todayKey: string,
	timeZone: string | null
) {
	if (filter === 'all') {
		return invoices;
	}
	return invoices.filter((invoice) => invoiceStandingOf(invoice, todayKey, timeZone) === filter);
}

function filterCountOf(filter: InvoiceFilter, summary: InvoiceStandingSummary, total: number) {
	if (filter === 'all') {
		return total;
	}
	return summary.counts[filter];
}

/** "2 open · 1 overdue · 4 paid": the standings the client's invoices are in, none at zero. */
function useSummaryText(summary: InvoiceStandingSummary) {
	const t = useTranslations();
	const parts: string[] = [];
	for (const [standing, key] of SUMMARY_KEYS) {
		const count = summary.counts[standing];
		if (count > 0) {
			parts.push(t(key, { count }));
		}
	}
	return parts.join(' · ');
}

interface InvoiceRowProps {
	invoice: TInvoice;
	todayKey: string;
	timeZone: string | null;
}

const ClientInvoiceRow = memo(function ClientInvoiceRow({ invoice, todayKey, timeZone }: InvoiceRowProps) {
	const t = useTranslations();
	const locale = useLocale();
	const numberText = numberTextOf(invoice);
	const issuedDay = invoiceDayOf(invoice.invoiceDate, timeZone);
	const issuedDayText = invoiceDayTextOf(issuedDay, locale);
	const issuedText = issuedDayText ?? t('invoices.UNDATED');
	const total = invoice.totalValue;
	const hasTotal = typeof total === 'number';
	let numberLabel = t('invoices.NO_NUMBER');
	if (numberText) {
		numberLabel = t('invoices.NUMBER', { number: numberText });
	}
	const standing = <InvoiceStandingLabel invoice={invoice} todayKey={todayKey} timeZone={timeZone} />;
	const dueText = <InvoiceDueText invoice={invoice} todayKey={todayKey} timeZone={timeZone} />;

	return (
		<li className="[content-visibility:auto] [contain-intrinsic-size:auto_48px]">
			<Link
				href={invoicePagePathOf(invoice.id)}
				className={cn(
					ROW_GRID,
					'-mx-2 min-h-12 rounded-md px-2 py-1.5 outline-none transition-colors hover:bg-foreground/[0.03] focus-visible:ring-[3px] focus-visible:ring-ring/25'
				)}
			>
				<span className="flex min-w-0 flex-col gap-0.5">
					<span className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-foreground">
						<FileText aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
						<span className="truncate tabular-nums">{numberLabel}</span>
					</span>
					<span className={cn(NARROW_ONLY, 'flex min-w-0 items-center gap-1.5 pl-6 text-xs')}>
						<span className="shrink-0 tabular-nums text-muted-foreground">{issuedText}</span>
						<span aria-hidden="true" className="text-muted-foreground">
							·
						</span>
						{dueText}
					</span>
				</span>
				<span className={cn(WIDE_ONLY, 'min-w-0 text-[13px] tabular-nums text-muted-foreground')}>
					<span className="truncate">{issuedText}</span>
				</span>
				<span className={cn(WIDE_ONLY, 'min-w-0')}>{dueText}</span>
				<span className={cn(WIDE_ONLY, 'min-w-0')}>{standing}</span>
				<span className="flex min-w-0 flex-col items-end gap-0.5">
					{hasTotal && (
						<MoneyFigure
							amount={total}
							currency={invoice.currency ?? null}
							className="text-[13px] font-medium text-foreground"
						/>
					)}
					{!hasTotal && <span className="text-[13px] text-muted-foreground">{t('invoices.NO_TOTAL')}</span>}
					<span className={cn(NARROW_ONLY, 'flex')}>{standing}</span>
				</span>
			</Link>
		</li>
	);
});

function ColumnLabels() {
	const t = useTranslations();
	return (
		<div
			aria-hidden="true"
			className={cn(
				ROW_GRID,
				'hidden min-h-8 hairline-b border-border text-xs font-medium text-muted-foreground @xl:grid'
			)}
		>
			<span>{t('invoices.new.details.NUMBER')}</span>
			<span>{t('invoices.new.details.ISSUE_DATE')}</span>
			<span>{t('invoices.new.details.DUE_DATE')}</span>
			<span>{t('common.STATUS')}</span>
			<span className="text-right">{t('invoices.new.TOTAL')}</span>
		</div>
	);
}

function RowsSkeleton() {
	return (
		<ul aria-hidden="true" className="hairline-divide-y divide-border">
			{SKELETON_ROWS.map((key) => (
				<li key={key} className={cn(ROW_GRID, 'min-h-12')}>
					<span className={cn('h-3 w-20', SKELETON_BAR)} />
					<span className={cn(WIDE_ONLY, 'h-3 w-16', SKELETON_BAR)} />
					<span className={cn(WIDE_ONLY, 'h-3 w-24', SKELETON_BAR)} />
					<span className={cn(WIDE_ONLY, 'h-3 w-16', SKELETON_BAR)} />
					<span className={cn('ml-auto h-3 w-16', SKELETON_BAR)} />
				</li>
			))}
		</ul>
	);
}

interface ClientInvoicesSectionProps {
	invoices: ReadonlyArray<TInvoice>;
	summary: InvoiceStandingSummary;
	todayKey: string;
	timeZone: string | null;
	isLoading: boolean;
	hasFailed: boolean;
	onRetry: () => void;
	newInvoiceHref: string | null;
	framed: boolean;
}

export function ClientInvoicesSection({
	invoices,
	summary,
	todayKey,
	timeZone,
	isLoading,
	hasFailed,
	onRetry,
	newInvoiceHref,
	framed
}: Readonly<ClientInvoicesSectionProps>) {
	const t = useTranslations();
	const [filter, setFilter] = useState<InvoiceFilter>('all');
	const [isExpanded, setIsExpanded] = useState(false);
	const summaryText = useSummaryText(summary);
	const total = invoices.length;
	const isFiltered = filter !== 'all';
	const hasManyInvoices = total > SHOWN_INVOICES;
	const hasFilter = hasManyInvoices || isFiltered;
	const rows = useMemo(
		() => rowsOfFilter(invoices, filter, todayKey, timeZone),
		[filter, invoices, timeZone, todayKey]
	);
	const firstRows = rows.slice(0, SHOWN_INVOICES);
	const moreRows = rows.slice(SHOWN_INVOICES);
	const hiddenCount = moreRows.length;
	const canFold = hiddenCount > 0;
	const hasRows = rows.length > 0;
	const hasInvoices = total > 0;
	const showsList = !isLoading && !hasFailed;

	let foldLabel = t('invoices.new.earlier.SHOW_MORE', { count: hiddenCount });
	if (isExpanded) {
		foldLabel = t('invoices.new.earlier.SHOW_FEWER');
	}

	const filterItems: SegmentedControlItem<InvoiceFilter>[] = FILTERS.map((value) => ({
		value,
		label: t(FILTER_LABEL_KEYS[value]),
		count: filterCountOf(value, summary, total)
	}));

	let filterControl: ReactNode;
	if (hasFilter && showsList) {
		filterControl = (
			<div className="-mx-1 max-w-full overflow-x-auto px-1 py-1 [scrollbar-width:none]">
				<SegmentedControl<InvoiceFilter>
					items={filterItems}
					value={filter}
					onValueChange={setFilter}
					ariaLabel={t('clients.invoices.FILTER_LABEL')}
				/>
			</div>
		);
	}

	let newInvoiceAction: ReactNode;
	if (newInvoiceHref) {
		newInvoiceAction = (
			<Button asChild variant="outline" size="default">
				<Link href={newInvoiceHref}>
					<Invoice />
					<span>{t('invoices.NEW_INVOICE')}</span>
				</Link>
			</Button>
		);
	}

	return (
		<ClientSection
			title={t('invoices.TITLE')}
			meta={showsList && summaryText}
			actions={filterControl}
			framed={framed}
		>
			<div className={cn('@container', framed && 'px-4 pb-2')}>
				{isLoading && <RowsSkeleton />}
				{hasFailed && <DashboardErrorNotice title={t('invoices.new.earlier.ERROR')} onRetry={onRetry} />}
				{showsList && !hasInvoices && (
					<BlockEmptyMessage
						title={t('clients.invoices.EMPTY_TITLE')}
						message={t('clients.invoices.EMPTY_MESSAGE')}
						action={newInvoiceAction}
						className="py-8"
					/>
				)}
				{showsList && hasInvoices && !hasRows && (
					<BlockEmptyMessage title={t('clients.invoices.NONE_IN_FILTER')} className="py-6" />
				)}
				{showsList && hasRows && (
					<>
						<ColumnLabels />
						<ul className="hairline-divide-y divide-border">
							{firstRows.map((invoice) => (
								<ClientInvoiceRow
									key={invoice.id}
									invoice={invoice}
									todayKey={todayKey}
									timeZone={timeZone}
								/>
							))}
						</ul>
						<AnimatedHeight>
							{isExpanded && (
								<ul className="hairline-divide-y hairline-t divide-border border-border">
									{moreRows.map((invoice) => (
										<ClientInvoiceRow
											key={invoice.id}
											invoice={invoice}
											todayKey={todayKey}
											timeZone={timeZone}
										/>
									))}
								</ul>
							)}
						</AnimatedHeight>
						{canFold && (
							<div className="py-2">
								<FoldToggle
									label={foldLabel}
									isExpanded={isExpanded}
									onToggle={() => setIsExpanded((expanded) => !expanded)}
								/>
							</div>
						)}
					</>
				)}
			</div>
		</ClientSection>
	);
}
