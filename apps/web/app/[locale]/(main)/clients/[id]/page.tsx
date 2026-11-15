'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { ClientDetailPageComponent } from '@/core/components/pages/clients/detail/page-component';
import { ClientDetailPageSkeleton } from '@/core/components/pages/clients/detail/client-detail-skeleton';

function Page() {
	return <ClientDetailPageComponent />;
}

export default withAuthentication(Page, { displayName: 'ClientDetailPage', skeleton: ClientDetailPageSkeleton });
