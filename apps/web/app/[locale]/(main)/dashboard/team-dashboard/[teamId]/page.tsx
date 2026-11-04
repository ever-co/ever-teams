'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { TeamDashboardPage } from '@/core/components/dashboards/team/team-dashboard-page';
import { TeamDashboardPageSkeleton } from '@/core/components/dashboards/team/team-dashboard-page-skeleton';

function TeamDashboard() {
	return <TeamDashboardPage />;
}

export default withAuthentication(TeamDashboard, {
	displayName: 'Team-dashboard',
	showPageSkeleton: true,
	skeleton: TeamDashboardPageSkeleton
});
