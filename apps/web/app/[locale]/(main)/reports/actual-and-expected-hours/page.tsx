'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { ActualExpectedPage } from '@/core/components/dashboards/actual-expected/actual-expected-page';
import { ActualExpectedPageSkeleton } from '@/core/components/dashboards/actual-expected/actual-expected-page-skeleton';
import { useCurrentOrganizationOwner } from '@/core/hooks/bootstrap/use-feature-data';

/** The workspace's date and number formats come with the organisation: its owner hook loads it on a direct visit. */
function ActualExpectedReport() {
	useCurrentOrganizationOwner();
	return <ActualExpectedPage />;
}

export default withAuthentication(ActualExpectedReport, {
	displayName: 'ActualExpectedReport',
	skeleton: ActualExpectedPageSkeleton
});
