'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { TimeActivityPage } from '@/core/components/dashboards/time-activity/time-activity-page';
import { TimeActivityPageSkeleton } from '@/core/components/dashboards/time-activity/time-activity-page-skeleton';
import { useCurrentOrganizationOwner } from '@/core/hooks/bootstrap/use-feature-data';

/** The workspace's date and number formats come with the organisation: its owner hook loads it on a direct visit. */
function TimeAndActivity() {
	useCurrentOrganizationOwner();
	return <TimeActivityPage />;
}
export default withAuthentication(TimeAndActivity, {
	displayName: 'Time and Activity',
	skeleton: TimeActivityPageSkeleton
});
