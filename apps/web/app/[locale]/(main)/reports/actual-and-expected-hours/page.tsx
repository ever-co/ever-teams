'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { ActualExpectedPage } from '@/core/components/dashboards/actual-expected/actual-expected-page';
import { ActualExpectedPageSkeleton } from '@/core/components/dashboards/actual-expected/actual-expected-page-skeleton';
import { useCurrentOrganizationOwner } from '@/core/hooks/bootstrap/use-feature-data';

/**
 * The organisation is loaded through the client service by its owner hook. The server-only organisation request
 * resolves to the production host in the browser bundle (seen on the Weekly limit report on stage, 2026-08-17).
 */
function ActualExpectedReport() {
	useCurrentOrganizationOwner();
	return <ActualExpectedPage />;
}

export default withAuthentication(ActualExpectedReport, {
	displayName: 'ActualExpectedReport',
	skeleton: ActualExpectedPageSkeleton
});
