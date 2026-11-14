'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { InvoiceDetailPageComponent } from '@/core/components/pages/invoices/detail/page-component';
import { InvoiceDetailPageSkeleton } from '@/core/components/pages/invoices/detail/invoice-detail-skeleton';

function Page() {
	return <InvoiceDetailPageComponent />;
}

export default withAuthentication(Page, { displayName: 'InvoiceDetailPage', skeleton: InvoiceDetailPageSkeleton });
