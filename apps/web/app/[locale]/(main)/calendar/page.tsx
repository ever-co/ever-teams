'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { CalendarPage } from '@/core/components/calendar/calendar-page';
import { CalendarPageSkeleton } from '@/core/components/calendar/calendar-page-skeleton';
import { useCurrentOrganizationOwner } from '@/core/hooks/bootstrap/use-feature-data';

/** The organisation (its first day of the week) is loaded through the client service by its owner hook. */
function Calendar() {
	useCurrentOrganizationOwner();
	return <CalendarPage />;
}

export default withAuthentication(Calendar, { displayName: 'Calendar', skeleton: CalendarPageSkeleton });
