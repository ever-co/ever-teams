'use client';

import { useMemo } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { invoiceService, type InvoicesPage } from '@/core/services/client/api/organizations/invoice.service';
import { queryKeys } from '@/core/query/keys';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { nextInvoiceNumberOf } from '@/core/lib/utils/invoices';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import type { TInvoice } from '@/core/types/schemas/organization/invoice.schema';

const NO_INVOICES: TInvoice[] = [];

function loadedCountOf(pages: ReadonlyArray<InvoicesPage>) {
	let count = 0;
	for (const page of pages) {
		count += page.items.length;
	}
	return count;
}

function nextPageOf(lastPage: InvoicesPage, pages: ReadonlyArray<InvoicesPage>) {
	const hasMore = loadedCountOf(pages) < lastPage.total;
	const gotRows = lastPage.items.length > 0;
	if (hasMore && gotRows) {
		return pages.length + 1;
	}
	return undefined;
}

export function useInvoicesQuery({ enabled }: Readonly<{ enabled: boolean }>) {
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();
	const hasScope = Boolean(tenantId) && Boolean(organizationId);

	const query = useInfiniteQuery({
		queryKey: queryKeys.invoices.list(tenantId, organizationId),
		queryFn: ({ pageParam, signal }) => invoiceService.getInvoices({ page: pageParam, signal }),
		initialPageParam: 1,
		getNextPageParam: nextPageOf,
		enabled: enabled && hasScope
	});

	const pages = query.data?.pages;
	const invoices = useMemo(() => (pages ?? []).flatMap((page) => page.items), [pages]);
	const lastPage = pages?.at(-1);

	return {
		invoices,
		/** As the API counts them; null until it answered. */
		total: lastPage?.total ?? null,
		isLoading: query.isLoading,
		isError: query.isError,
		hasMore: query.hasNextPage,
		isLoadingMore: query.isFetchingNextPage,
		loadMore: query.fetchNextPage,
		refetch: query.refetch
	};
}

export function useClientInvoices(clientId: string | null) {
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();
	const hasScope = Boolean(tenantId) && Boolean(organizationId);

	const query = useQuery({
		queryKey: queryKeys.invoices.ofClient(tenantId, organizationId, clientId),
		queryFn: ({ signal }) => invoiceService.getClientInvoices(clientId as string, signal),
		enabled: hasScope && Boolean(clientId)
	});

	return {
		invoices: query.data ?? NO_INVOICES,
		isLoading: query.isLoading,
		isError: query.isError,
		refetch: query.refetch
	};
}

/** Read again each time the form opens, never kept: another invoice may have taken the number in between. */
export function useNextInvoiceNumber(enabled: boolean) {
	const tenantId = getTenantIdCookie();

	const query = useQuery({
		queryKey: queryKeys.invoices.highestNumber(tenantId),
		queryFn: ({ signal }) => invoiceService.getHighestInvoiceNumber(signal),
		enabled: enabled && Boolean(tenantId),
		staleTime: 0,
		gcTime: 0
	});

	let nextNumber: number | null = null;
	if (query.isSuccess) {
		nextNumber = nextInvoiceNumberOf(query.data);
	}

	return {
		nextNumber,
		isLoading: query.isLoading,
		isError: query.isError,
		refetch: query.refetch
	};
}

/** The API answers a missing invoice with 404, and an id that is not one with 400: there is nothing to read again. */
function isMissingInvoice(error: unknown) {
	if (!ApiErrorService.isApiError(error)) {
		return false;
	}
	const status = error.httpResponseStatus;
	return status === 404 || status === 400;
}

function retriesInvoiceRead(failureCount: number, error: unknown) {
	if (isMissingInvoice(error)) {
		return false;
	}
	return failureCount < 2;
}

/** One invoice with its lines, read again whenever its editor opens: it may have changed since the list was read. */
export function useInvoiceQuery(invoiceId: string | null) {
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();
	const hasScope = Boolean(tenantId) && Boolean(organizationId);

	const query = useQuery({
		queryKey: queryKeys.invoices.detail(tenantId, organizationId, invoiceId),
		queryFn: ({ signal }) => invoiceService.getInvoice(invoiceId as string, { signal, tenantId }),
		enabled: hasScope && Boolean(invoiceId),
		retry: retriesInvoiceRead,
		staleTime: 0
	});

	return {
		invoice: query.data ?? null,
		isLoading: query.isLoading,
		isMissing: isMissingInvoice(query.error),
		isError: query.isError,
		refetch: query.refetch
	};
}
