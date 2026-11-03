'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { PaymentsDuePage } from '@/core/components/dashboards/payments-due/payments-due-page';
import { PaymentsDuePageSkeleton } from '@/core/components/dashboards/payments-due/payments-due-page-skeleton';
import { useCurrentOrganizationOwner } from '@/core/hooks/bootstrap/use-feature-data';

/** The organisation (its currency prices members without one of their own) is loaded through its owner hook. */
function PaymentsDueReport() {
	useCurrentOrganizationOwner();
	return <PaymentsDuePage />;
}

export default withAuthentication(PaymentsDueReport, {
	displayName: 'PaymentsDueReport',
	skeleton: PaymentsDuePageSkeleton
});
