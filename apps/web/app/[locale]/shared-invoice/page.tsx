import { Suspense } from 'react';
import { SharedInvoicePage } from '@/core/components/pages/shared-invoice/shared-invoice-page';

/**
 * An invoice read through the link of its email (ever-co/ever-gauzy#11856): no account, no navigation. The link is
 * `/shared-invoice#id=<id>&token=<token>`: the token stays in the fragment, which the browser never sends to this server.
 */
export default function SharedInvoiceRoute() {
	return (
		<Suspense>
			<SharedInvoicePage />
		</Suspense>
	);
}
