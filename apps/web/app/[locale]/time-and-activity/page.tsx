'use client';

import { withAuthentication } from '@/lib/app/authenticator';
import { TimeActivityComponents } from './components/page-component';

function TimeAndActivity() {
	return <TimeActivityComponents />;
}
export default withAuthentication(TimeAndActivity, { displayName: 'Time and Activity' });
