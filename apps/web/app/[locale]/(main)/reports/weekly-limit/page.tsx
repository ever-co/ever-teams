'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { WeeklyLimitPage } from '@/core/components/dashboards/weekly-limit/weekly-limit-page';
import { WeeklyLimitPageSkeleton } from '@/core/components/dashboards/weekly-limit/weekly-limit-page-skeleton';
import { useCurrentOrganizationOwner } from '@/core/hooks/bootstrap/use-feature-data';

/**
 * The organisation is loaded through the client service by its owner hook. The server-only organisation request
 * resolves to the production host in the browser bundle, which broke this report on stage (2026-08-17).
 */
function WeeklyLimitReport() {
	useCurrentOrganizationOwner();
	return <WeeklyLimitPage />;
}

export default withAuthentication(WeeklyLimitReport, {
	displayName: 'WeeklyLimitReport',
	skeleton: WeeklyLimitPageSkeleton
});
