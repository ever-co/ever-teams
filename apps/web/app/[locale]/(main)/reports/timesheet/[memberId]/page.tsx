'use client';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { TimesheetsPage } from '@/core/components/dashboards/timesheets/timesheets-page';
import { TimesheetsPageSkeleton } from '@/core/components/dashboards/timesheets/timesheets-page-skeleton';
import { useCurrentOrganizationOwner } from '@/core/hooks/bootstrap/use-feature-data';
import { type ComponentProps, memo } from 'react';

const MemoizedTimesheetsPage = memo(TimesheetsPage);

/** The workspace's date and number formats come with the organisation: its owner hook loads it on a direct visit. */
function TimeSheet(props: ComponentProps<typeof TimesheetsPage>) {
	useCurrentOrganizationOwner();
	return <MemoizedTimesheetsPage {...props} />;
}

export default withAuthentication(TimeSheet, {
	displayName: 'TimeSheet',
	showPageSkeleton: true,
	skeleton: TimesheetsPageSkeleton
});
