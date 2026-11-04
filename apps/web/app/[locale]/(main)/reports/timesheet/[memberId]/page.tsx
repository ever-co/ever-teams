'use client';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { TimesheetsPage } from '@/core/components/dashboards/timesheets/timesheets-page';
import { TimesheetsPageSkeleton } from '@/core/components/dashboards/timesheets/timesheets-page-skeleton';
import { memo } from 'react';

const TimeSheet = memo(TimesheetsPage);

export default withAuthentication(TimeSheet, {
	displayName: 'TimeSheet',
	showPageSkeleton: true,
	skeleton: TimesheetsPageSkeleton
});
