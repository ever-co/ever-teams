'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { ActualExpectedPage } from '@/core/components/dashboards/actual-expected/actual-expected-page';
import { ActualExpectedPageSkeleton } from '@/core/components/dashboards/actual-expected/actual-expected-page-skeleton';

function ActualExpectedReport() {
	return <ActualExpectedPage />;
}

export default withAuthentication(ActualExpectedReport, {
	displayName: 'ActualExpectedReport',
	skeleton: ActualExpectedPageSkeleton
});
