'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { DashboardSection } from '@/core/components/dashboards/kit/dashboard-layout';
import { TimeSplitBody, TimeSplitSwitch, timeSplitMetaOf } from '@/core/components/dashboards/kit/time-split';
import { useTimeSplit } from '@/core/hooks/dashboards/use-time-split';
import type { DailyReportRow } from '@/core/lib/utils/daily-report-figures';
import type { ITimeLogGroupedDailyReport } from '@/core/types/interfaces/activity/activity-report';

/** What the block reads from the report page: its rows, the report behind them, and who may see whose time. */
export interface TimeActivitySplitSource {
	rows: ReadonlyArray<DailyReportRow>;
	report: ReadonlyArray<ITimeLogGroupedDailyReport>;
	isManager: boolean;
	ownEmployeeId: string | undefined;
	isDailyPending: boolean;
	isDailyError: boolean;
	refetchDaily: () => void;
}

/** Where the time in view went, above the table: it follows the page's period and filters. */
export function TimeActivityTimeSplit({ report }: Readonly<{ report: TimeActivitySplitSource }>) {
	const t = useTranslations();
	const { isManager, ownEmployeeId } = report;
	// The table shows a member only their own time: the split by client keeps to the same rows
	const keepRow = useCallback(
		(row: Pick<DailyReportRow, 'employeeId'>) => isManager || row.employeeId === ownEmployeeId,
		[isManager, ownEmployeeId]
	);
	const split = useTimeSplit({ rows: report.rows, report: report.report, keepRow });
	const title = t('dashboard.team.projects.TITLE');
	let meta: string | null = null;
	if (!report.isDailyPending) {
		meta = timeSplitMetaOf(split, t);
	}
	return (
		<DashboardSection title={title} meta={meta} actions={<TimeSplitSwitch split={split} />} ariaLabel={title}>
			<TimeSplitBody
				split={split}
				isLoading={report.isDailyPending}
				isError={report.isDailyError}
				onRetry={report.refetchDaily}
			/>
		</DashboardSection>
	);
}
