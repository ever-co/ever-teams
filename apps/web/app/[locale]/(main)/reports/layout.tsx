'use client';

import type { ComponentType, ReactNode } from 'react';
import { useSelectedLayoutSegment } from 'next/navigation';
import MustBeAManager from '@/core/components/auth/must-be-a-manager';
import { TimeActivityPageSkeleton } from '@/core/components/dashboards/time-activity/time-activity-page-skeleton';
import { TimesheetsPageSkeleton } from '@/core/components/dashboards/timesheets/timesheets-page-skeleton';
import { ActualExpectedPageSkeleton } from '@/core/components/dashboards/actual-expected/actual-expected-page-skeleton';
import { ManualTimeEditsPageSkeleton } from '@/core/components/dashboards/manual-time-edits/manual-time-edits-page-skeleton';
import { PaymentsDuePageSkeleton } from '@/core/components/dashboards/payments-due/payments-due-page-skeleton';
import { ProjectBudgetPageSkeleton } from '@/core/components/dashboards/project-budget/project-budget-page-skeleton';
import { WeeklyLimitPageSkeleton } from '@/core/components/dashboards/weekly-limit/weekly-limit-page-skeleton';

const REPORT_SKELETONS: Readonly<Record<string, ComponentType>> = {
	'time-and-activity': TimeActivityPageSkeleton,
	'weekly-limit': WeeklyLimitPageSkeleton,
	timesheet: TimesheetsPageSkeleton,
	'manual-time-edits': ManualTimeEditsPageSkeleton,
	'actual-and-expected-hours': ActualExpectedPageSkeleton,
	'payments-due': PaymentsDuePageSkeleton,
	'project-budget': ProjectBudgetPageSkeleton
};

function membershipFallbackOf(segment: string | null): ReactNode {
	if (!segment) {
		return undefined;
	}
	const ReportSkeleton = REPORT_SKELETONS[segment];
	if (!ReportSkeleton) {
		return undefined;
	}
	return <ReportSkeleton />;
}

export default function ReportsLayout({ children }: { children: ReactNode }) {
	const segment = useSelectedLayoutSegment();
	const fallback = membershipFallbackOf(segment);
	return (
		<MustBeAManager useRedirect fallback={fallback}>
			{children}
		</MustBeAManager>
	);
}
