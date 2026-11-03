'use client';

import type { ComponentType, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useSelectedLayoutSegment } from 'next/navigation';
import MustBeAManager from '@/core/components/auth/must-be-a-manager';

// Each skeleton shares its module with its report's charts and tables: loaded only for the report being opened.
const TimeActivityPageSkeleton = dynamic(() =>
	import('@/core/components/dashboards/time-activity/time-activity-page-skeleton').then(
		(module) => module.TimeActivityPageSkeleton
	)
);
const WeeklyLimitPageSkeleton = dynamic(() =>
	import('@/core/components/dashboards/weekly-limit/weekly-limit-page-skeleton').then(
		(module) => module.WeeklyLimitPageSkeleton
	)
);
const TimesheetsPageSkeleton = dynamic(() =>
	import('@/core/components/dashboards/timesheets/timesheets-page-skeleton').then(
		(module) => module.TimesheetsPageSkeleton
	)
);
const ManualTimeEditsPageSkeleton = dynamic(() =>
	import('@/core/components/dashboards/manual-time-edits/manual-time-edits-page-skeleton').then(
		(module) => module.ManualTimeEditsPageSkeleton
	)
);
const ActualExpectedPageSkeleton = dynamic(() =>
	import('@/core/components/dashboards/actual-expected/actual-expected-page-skeleton').then(
		(module) => module.ActualExpectedPageSkeleton
	)
);
const PaymentsDuePageSkeleton = dynamic(() =>
	import('@/core/components/dashboards/payments-due/payments-due-page-skeleton').then(
		(module) => module.PaymentsDuePageSkeleton
	)
);
const ProjectBudgetPageSkeleton = dynamic(() =>
	import('@/core/components/dashboards/project-budget/project-budget-page-skeleton').then(
		(module) => module.ProjectBudgetPageSkeleton
	)
);

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
