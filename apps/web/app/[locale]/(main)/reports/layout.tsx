'use client';

import type { ComponentType, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useSelectedLayoutSegment } from 'next/navigation';
import MustBeAManager from '@/core/components/auth/must-be-a-manager';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';
import { readsTimeLogReports } from '@/core/lib/utils/report-access';

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

/**
 * The reports that read only the reader's own time for anyone who manages nothing, which My work links to (#5623). The
 * others show a team's time and stay with its managers.
 */
const MEMBER_REPORTS: ReadonlySet<string> = new Set(['time-and-activity']);

function isMemberReport(segment: string | null) {
	if (!segment) {
		return false;
	}
	return MEMBER_REPORTS.has(segment);
}

export default function ReportsLayout({ children }: Readonly<{ children: ReactNode }>) {
	const segment = useSelectedLayoutSegment();
	const fallback = membershipFallbackOf(segment);
	const { myPermissions, isLoading: arePermissionsLoading } = useMyRolePermissionsQuery();
	const opensToMembers = isMemberReport(segment);
	// Only for a role Gauzy reads time reports for: anyone else is still sent to the team home
	const admitsMembers = opensToMembers && readsTimeLogReports(myPermissions);
	const awaitsPermissions = opensToMembers && arePermissionsLoading;
	if (awaitsPermissions) {
		return <>{fallback}</>;
	}
	return (
		<MustBeAManager useRedirect fallback={fallback} admitsMembers={admitsMembers}>
			{children}
		</MustBeAManager>
	);
}
