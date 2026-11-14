'use client';

import { useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { INVOICE_STANDINGS, type InvoiceStanding } from '@/core/lib/utils/invoice-standing';
import { urlWithParams } from '@/core/lib/utils/project-list';
import type { LedgerFilter } from './use-invoices-overview';

const STANDING_PARAM = 'standing';

const STANDING_NAMES: ReadonlyArray<string> = INVOICE_STANDINGS;

function isInvoiceStanding(value: string): value is InvoiceStanding {
	return STANDING_NAMES.includes(value);
}

function ledgerFilterOf(value: string | null) {
	if (!value) {
		return 'all';
	}
	if (isInvoiceStanding(value)) {
		return value;
	}
	return 'all';
}

/** The standing the ledger is filtered by, kept in the address (`?standing=overdue`) so a link or a reload keeps it. */
export function useLedgerStanding() {
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const filter: LedgerFilter = ledgerFilterOf(searchParams.get(STANDING_PARAM));

	const setFilter = useCallback(
		(next: LedgerFilter) => {
			const params = new URLSearchParams(searchParams.toString());
			params.delete(STANDING_PARAM);
			if (next !== 'all') {
				params.set(STANDING_PARAM, next);
			}
			const address = urlWithParams(pathname, params);
			// `null`, never `window.history.state`: Next's marker in it skips the router's sync of the search params
			window.history.replaceState(null, '', address);
		},
		[pathname, searchParams]
	);

	return { filter, setFilter };
}
