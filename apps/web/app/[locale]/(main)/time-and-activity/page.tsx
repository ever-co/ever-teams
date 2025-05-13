'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { TimeActivityComponents } from '@/core/components/activities/page-component';

function TimeAndActivity() {
	return <TimeActivityComponents />;
}
export default withAuthentication(TimeAndActivity, { displayName: 'Time and Activity' });
