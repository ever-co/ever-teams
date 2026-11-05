'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { ManualTimeEditsPage } from '@/core/components/dashboards/manual-time-edits/manual-time-edits-page';
import { ManualTimeEditsPageSkeleton } from '@/core/components/dashboards/manual-time-edits/manual-time-edits-page-skeleton';
import { useCurrentOrganizationOwner } from '@/core/hooks/bootstrap/use-feature-data';

/**
 * The organisation is loaded through the client service by its owner hook. The server-only organisation request
 * resolves to the production host in the browser bundle (the reason the Weekly limit report does the same).
 */
function ManualTimeEditsReport() {
	useCurrentOrganizationOwner();
	return <ManualTimeEditsPage />;
}

export default withAuthentication(ManualTimeEditsReport, {
	displayName: 'ManualTimeEditsReport',
	skeleton: ManualTimeEditsPageSkeleton
});
