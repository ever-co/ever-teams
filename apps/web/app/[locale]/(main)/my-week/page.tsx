'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { MyWeekPage } from '@/core/components/dashboards/my-week/my-week-page';
import { MyWeekPageSkeleton } from '@/core/components/dashboards/my-week/my-week-page-skeleton';
import { useCurrentOrganizationOwner } from '@/core/hooks/bootstrap/use-feature-data';

/** The workspace's week start, clock and formats come with the organisation, loaded here on a direct visit. */
function MyWeek() {
	useCurrentOrganizationOwner();
	return <MyWeekPage />;
}

export default withAuthentication(MyWeek, { displayName: 'MyWeek', skeleton: MyWeekPageSkeleton });
