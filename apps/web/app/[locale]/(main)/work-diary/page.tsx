'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { WorkDiaryPage } from '@/core/components/dashboards/work-diary/work-diary-page';
import { WorkDiaryPageSkeleton } from '@/core/components/dashboards/work-diary/work-diary-page-skeleton';
import { useCurrentOrganizationOwner } from '@/core/hooks/bootstrap/use-feature-data';

/** The organisation (its first day of the week, for the day strip) is loaded through its owner hook. */
function WorkDiary() {
	useCurrentOrganizationOwner();
	return <WorkDiaryPage />;
}

export default withAuthentication(WorkDiary, { displayName: 'WorkDiary', skeleton: WorkDiaryPageSkeleton });
