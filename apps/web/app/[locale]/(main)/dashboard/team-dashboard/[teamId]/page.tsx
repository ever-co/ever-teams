'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { TeamDashboardPage } from '@/core/components/dashboards/team/team-dashboard-page';
import { TeamDashboardPageSkeleton } from '@/core/components/dashboards/team/team-dashboard-page-skeleton';
import { useCurrentOrganizationOwner } from '@/core/hooks/bootstrap/use-feature-data';

/** The workspace's week start, clock and formats come with the organisation, loaded here on a direct visit. */
function TeamDashboard() {
	useCurrentOrganizationOwner();
	return <TeamDashboardPage />;
}

export default withAuthentication(TeamDashboard, {
	displayName: 'Team-dashboard',
	showPageSkeleton: true,
	skeleton: TeamDashboardPageSkeleton
});
