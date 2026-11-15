'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import type { InvoiceStatus } from '@/core/lib/utils/invoices';
import { queryKeys } from '@/core/query/keys';
import { invoiceService, type InvoicesScope } from '@/core/services/client/api/organizations/invoice.service';
import type { TInvoice } from '@/core/types/schemas/organization/invoice.schema';

/** The invoices that still ask for something: a draft to finish and send, or money owed. */
export const LIVE_INVOICE_STATUSES: ReadonlyArray<InvoiceStatus> = ['DRAFT', 'SENT', 'VIEWED', 'PARTIALLY_PAID'];

const NO_INVOICES: TInvoice[] = [];

/** Every draft and every invoice still owed in the workspace, read whole so their counts and sums are exact. */
export function useLiveInvoices({ enabled }: Readonly<{ enabled: boolean }>) {
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();
	const hasScope = Boolean(tenantId) && Boolean(organizationId);
	const scope = useMemo<InvoicesScope | undefined>(() => {
		if (!hasScope) {
			return undefined;
		}
		return { organizationId, tenantId };
	}, [hasScope, organizationId, tenantId]);

	const query = useQuery({
		queryKey: queryKeys.invoices.live(tenantId, organizationId),
		queryFn: ({ signal }) => invoiceService.getInvoicesInStatuses(LIVE_INVOICE_STATUSES, signal, scope),
		enabled: enabled && hasScope
	});

	return {
		invoices: query.data ?? NO_INVOICES,
		isLoading: query.isLoading,
		isError: query.isError,
		refetch: query.refetch
	};
}
