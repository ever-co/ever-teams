'use client';

import { useMemo } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
	invoiceService,
	type InvoicesPage,
	type InvoicesScope
} from '@/core/services/client/api/organizations/invoice.service';
import { queryKeys } from '@/core/query/keys';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { nextInvoiceNumberOf } from '@/core/lib/utils/invoices';
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
	const scope = useMemo<InvoicesScope | null>(() => {
		if (!hasScope) {
			return null;
		}
		return { organizationId, tenantId };
	}, [hasScope, organizationId, tenantId]);

	const query = useInfiniteQuery({
		queryKey: queryKeys.invoices.list(tenantId, organizationId),
		// The scope the key names, not the cookies read when a page is asked for: another tab may have switched them
		queryFn: ({ pageParam, signal }) =>
			invoiceService.getInvoices({
				page: pageParam,
				signal,
				scope: tenantId && organizationId ? { organizationId, tenantId } : undefined
			}),
		initialPageParam: 1,
		getNextPageParam: nextPageOf,
		enabled: enabled && hasScope
	});

	const pages = query.data?.pages;
	const invoices = useMemo(() => (pages ?? []).flatMap((page) => page.items), [pages]);
	const lastPage = pages?.at(-1);

	return {
		invoices,
		/** The workspace the list was read in: an action on one of its invoices is made there, or refused. */
		scope,
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
		queryFn: ({ signal }) =>
			invoiceService.getClientInvoices(
				clientId as string,
				signal,
				tenantId && organizationId ? { organizationId, tenantId } : undefined
			),
		enabled: hasScope && Boolean(clientId)
	});

	return {
		invoices: query.data ?? NO_INVOICES,
		isLoading: query.isLoading,
		/** Read again while its last answer is shown, as after a failed save: the new answer can hold that invoice. */
		isRefreshing: query.isFetching && !query.isLoading,
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
