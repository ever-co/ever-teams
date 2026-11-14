'use client';

import { useMemo } from 'react';
import {
	invoiceStandingOf,
	invoiceStandingSummaryOf,
	type InvoiceStanding,
	type InvoiceStandingSummary
} from '@/core/lib/utils/invoice-standing';
import { invoiceStatusOf } from '@/core/lib/utils/invoices';
import type { TInvoice } from '@/core/types/schemas/organization/invoice.schema';
import { useInvoiceClock } from './use-invoice-clock';
import { useInvoicesQuery } from './use-invoices-query';
import { LIVE_INVOICE_STATUSES, useLiveInvoices } from './use-live-invoices';

export type LedgerFilter = 'all' | InvoiceStanding;

/** The standings of the live invoices, read whole: their counts and lists never depend on the pages loaded. */
const WHOLE_STANDINGS: ReadonlySet<LedgerFilter> = new Set<LedgerFilter>(['draft', 'open', 'overdue']);

export function isWholeStanding(filter: LedgerFilter) {
	return WHOLE_STANDINGS.has(filter);
}

function isLiveInvoice(invoice: TInvoice) {
	const status = invoiceStatusOf(invoice.status);
	if (!status) {
		return false;
	}
	return LIVE_INVOICE_STATUSES.includes(status);
}

function numberOf(invoice: TInvoice) {
	return invoice.invoiceNumber ?? 0;
}

/** The ledger's own order, newest issue first then highest number, as the API sorts its pages. */
function compareLedgerOrder(first: TInvoice, second: TInvoice) {
	const firstDate = first.invoiceDate ?? '';
	const secondDate = second.invoiceDate ?? '';
	if (firstDate !== secondDate) {
		return secondDate.localeCompare(firstDate);
	}
	return numberOf(second) - numberOf(first);
}

export type StandingCounts = Partial<Record<LedgerFilter, number>>;

function countsOf(
	total: number | null,
	live: InvoiceStandingSummary | null,
	loaded: InvoiceStandingSummary | null
): StandingCounts {
	const counts: StandingCounts = {};
	if (total !== null) {
		counts.all = total;
	}
	if (live) {
		counts.draft = live.counts.draft;
		counts.open = live.counts.open;
		counts.overdue = live.counts.overdue;
	}
	if (loaded) {
		counts.paid = loaded.counts.paid;
		counts.void = loaded.counts.void;
	}
	return counts;
}

/**
 * Everything the invoices page reads. The ledger pages come 50 at a time; the drafts and the invoices still owed are
 * read whole (from the pages when they already hold every invoice, else apart), so the money figures and the Drafts,
 * Open and Overdue filters are exact whatever was loaded. Paid and Void filter the loaded pages and say so.
 */
export function useInvoicesOverview({ enabled, filter }: Readonly<{ enabled: boolean; filter: LedgerFilter }>) {
	const list = useInvoicesQuery({ enabled });
	const { todayKey, timeZone } = useInvoiceClock();
	const total = list.total;
	const hasTotal = total !== null;
	const loadedCount = list.invoices.length;
	const hasEveryInvoice = hasTotal && loadedCount >= total;
	const readsLiveApart = enabled && hasTotal && !hasEveryInvoice;
	const live = useLiveInvoices({ enabled: readsLiveApart });

	const liveInvoices = useMemo(() => {
		if (hasEveryInvoice) {
			return list.invoices.filter(isLiveInvoice);
		}
		return [...live.invoices].sort(compareLedgerOrder);
	}, [hasEveryInvoice, list.invoices, live.invoices]);

	const hasLiveRead = readsLiveApart && !live.isLoading && !live.isError;
	const isLiveKnown = hasEveryInvoice || hasLiveRead;

	const liveSummary = useMemo(() => {
		if (!isLiveKnown) {
			return null;
		}
		return invoiceStandingSummaryOf(liveInvoices, todayKey, timeZone);
	}, [isLiveKnown, liveInvoices, timeZone, todayKey]);

	const loadedSummary = useMemo(() => {
		if (!hasEveryInvoice) {
			return null;
		}
		return invoiceStandingSummaryOf(list.invoices, todayKey, timeZone);
	}, [hasEveryInvoice, list.invoices, timeZone, todayKey]);

	const isFilterWhole = isWholeStanding(filter);

	const rows = useMemo(() => {
		if (filter === 'all') {
			return list.invoices;
		}
		let source = list.invoices;
		if (isFilterWhole) {
			source = liveInvoices;
		}
		return source.filter((invoice) => invoiceStandingOf(invoice, todayKey, timeZone) === filter);
	}, [filter, isFilterWhole, list.invoices, liveInvoices, timeZone, todayKey]);

	const counts = useMemo(() => countsOf(total, liveSummary, loadedSummary), [liveSummary, loadedSummary, total]);

	const isLiveLoading = readsLiveApart && live.isLoading;
	const hasLiveFailed = readsLiveApart && live.isError;
	/** Paid and Void look through the loaded pages: more pages may hold more of them. */
	const mayHoldMore = !isFilterWhole && list.hasMore;

	return {
		list,
		rows,
		counts,
		liveSummary,
		hasEveryInvoice,
		isFilterWhole,
		isLiveLoading,
		hasLiveFailed,
		refetchLive: live.refetch,
		mayHoldMore,
		todayKey,
		timeZone
	};
}

export type InvoicesOverview = ReturnType<typeof useInvoicesOverview>;
