'use client';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { TimeSheetPageContent } from '@/core/components/pages/timesheet/timesheet-page-content';
import { memo } from 'react';

const TimeSheet = memo(TimeSheetPageContent);

export default withAuthentication(TimeSheet, { displayName: 'TimeSheet', showPageSkeleton: true });
