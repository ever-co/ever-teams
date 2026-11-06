'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { TimeActivityPage } from '@/core/components/dashboards/time-activity/time-activity-page';
import { TimeActivityPageSkeleton } from '@/core/components/dashboards/time-activity/time-activity-page-skeleton';

function TimeAndActivity() {
	return <TimeActivityPage />;
}
export default withAuthentication(TimeAndActivity, {
	displayName: 'Time and Activity',
	skeleton: TimeActivityPageSkeleton
});
