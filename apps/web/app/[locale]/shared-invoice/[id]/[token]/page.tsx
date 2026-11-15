import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { SharedInvoicePage } from '@/core/components/pages/shared-invoice/shared-invoice-page';
import { isSharedInvoiceLink } from '@/core/lib/utils/shared-invoice';

export default async function SharedInvoiceRoute({
	params
}: Readonly<{ params: Promise<{ id: string; token: string }> }>) {
	const { id, token } = await params;
	const decodedToken = decodeURIComponent(token ?? '');
	if (!isSharedInvoiceLink(id, decodedToken)) {
		notFound();
	}
	return (
		<Suspense>
			<SharedInvoicePage id={id} token={decodedToken} />
		</Suspense>
	);
}
