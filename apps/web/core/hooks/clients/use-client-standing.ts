'use client';

import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useInvoiceClock } from '@/core/hooks/invoices/use-invoice-clock';
import { useClientInvoices } from '@/core/hooks/invoices/use-invoices-query';
import { invoiceStandingSummaryOf } from '@/core/lib/utils/invoice-standing';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';

/**
 * A client's invoices and what they add up to (owed, overdue, billed, the latest one): one read, the composer's own.
 * A null client reads nothing, for a role that may not see invoices. Invoices are dated in the organization's zone,
 * so the figures wait for it, unless it could not be read.
 */
export function useClientStanding(clientId: string | null, isOrganizationFailed: boolean) {
	const read = useClientInvoices(clientId);
	const { todayKey, timeZone } = useInvoiceClock();
	const organization = useAtomValue(currentOrganizationState);
	const isOrganizationKnown = organization !== null;
	const isClockReady = isOrganizationKnown || isOrganizationFailed;
	const invoices = read.invoices;

	const summary = useMemo(
		() => invoiceStandingSummaryOf(invoices, todayKey, timeZone),
		[invoices, timeZone, todayKey]
	);

	const isReadOff = clientId === null;
	const isWaitingForClock = !isReadOff && !isClockReady;
	const isLoading = read.isLoading || isWaitingForClock;

	return {
		invoices,
		summary,
		todayKey,
		timeZone,
		isLoading,
		isError: read.isError,
		refetch: read.refetch
	};
}

export type ClientStanding = ReturnType<typeof useClientStanding>;
